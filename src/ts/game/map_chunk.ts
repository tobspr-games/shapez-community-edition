import { globalConfig } from "../core/config";
import { createLogger } from "../core/logging";
import { RandomNumberGenerator } from "../core/rng";
import { clamp, fastArrayDeleteValueIfContained, make2DUndefinedArray } from "../core/utils";
import { Vector } from "../core/vector";
import { BaseItem } from "./base_item";
import { enumColors } from "./colors";
import { Entity } from "./entity";
import { COLOR_ITEM_SINGLETONS } from "./items/color_item";
import { GameRoot } from "./root";
import { enumSubShape } from "./shape_definition";
import { Rectangle } from "../core/rectangle";

const logger = createLogger("map_chunk");

export const MODS_ADDITIONAL_SHAPE_MAP_WEIGHTS: {
    [idx: string]: (distanceToOriginInChunks: number) => number;
} = {};

export class MapChunk {
    public tileX: number;
    public tileY: number;

    /** Stores the contents of the lower (= map resources) layer */
    public lowerLayer: Array<Array<BaseItem>> = make2DUndefinedArray(
        globalConfig.mapChunkSize,
        globalConfig.mapChunkSize
    );

    /** Stores the contents of the regular layer */
    public contents: Array<Array<Entity>> = make2DUndefinedArray(
        globalConfig.mapChunkSize,
        globalConfig.mapChunkSize
    );

    /** Stores the contents of the wires layer */
    public wireContents: Array<Array<Entity>> = make2DUndefinedArray(
        globalConfig.mapChunkSize,
        globalConfig.mapChunkSize
    );

    public containedEntities: Array<Entity> = [];

    public worldSpaceRectangle: Rectangle;
    public tileSpaceRectangle: Rectangle;

    /** Which entities this chunk contains, sorted by layer */
    public containedEntitiesByLayer: Record<Layer, Array<Entity>> = {
        regular: [],
        wires: [],
    };

    /** Store which patches we have so we can render them in the overview */
    public patches: Array<{
        pos: Vector;
        item: BaseItem;
        size: number;
    }> = [];

    constructor(public root: GameRoot, public x: number, public y: number) {
        this.tileX = x * globalConfig.mapChunkSize;
        this.tileY = y * globalConfig.mapChunkSize;

        /** World space rectangle, can be used for culling */
        this.worldSpaceRectangle = new Rectangle(
            this.tileX * globalConfig.tileSize,
            this.tileY * globalConfig.tileSize,
            globalConfig.mapChunkWorldSize,
            globalConfig.mapChunkWorldSize
        );

        /** Tile space rectangle, can be used for culling */
        this.tileSpaceRectangle = new Rectangle(
            this.tileX,
            this.tileY,
            globalConfig.mapChunkSize,
            globalConfig.mapChunkSize
        );
        this.generateLowerLayer();
    }

    /**
     * Generates a patch filled with the given item
     * @param overrideX Override the X position of the patch
     * @param overrideY Override the Y position of the patch
     */
    internalGeneratePatch(
        rng: RandomNumberGenerator,
        patchSize: number,
        item: BaseItem,
        overrideX: number = null,
        overrideY: number = null
    ) {
        const border = Math.ceil(patchSize / 2 + 3);

        // Find a position within the chunk which is not blocked
        let patchX = rng.nextIntRange(border, globalConfig.mapChunkSize - border - 1);
        let patchY = rng.nextIntRange(border, globalConfig.mapChunkSize - border - 1);

        if (overrideX !== null) {
            patchX = overrideX;
        }

        if (overrideY !== null) {
            patchY = overrideY;
        }

        const avgPos = new Vector(0, 0);
        let patchesDrawn = 0;

        // Each patch consists of multiple circles
        const numCircles = patchSize;

        for (let i = 0; i <= numCircles; ++i) {
            // Determine circle parameters
            const circleRadius = Math.min(1 + i, patchSize);
            const circleRadiusSquare = circleRadius * circleRadius;
            const circleOffsetRadius = (numCircles - i) / 2 + 2;

            // We draw an elipsis actually
            const circleScaleX = rng.nextRange(0.9, 1.1);
            const circleScaleY = rng.nextRange(0.9, 1.1);

            const circleX = patchX + rng.nextIntRange(-circleOffsetRadius, circleOffsetRadius);
            const circleY = patchY + rng.nextIntRange(-circleOffsetRadius, circleOffsetRadius);

            for (let dx = -circleRadius * circleScaleX - 2; dx <= circleRadius * circleScaleX + 2; ++dx) {
                for (let dy = -circleRadius * circleScaleY - 2; dy <= circleRadius * circleScaleY + 2; ++dy) {
                    const x = Math.round(circleX + dx);
                    const y = Math.round(circleY + dy);
                    if (x >= 0 && x < globalConfig.mapChunkSize && y >= 0 && y <= globalConfig.mapChunkSize) {
                        const originalDx = dx / circleScaleX;
                        const originalDy = dy / circleScaleY;
                        if (originalDx * originalDx + originalDy * originalDy <= circleRadiusSquare) {
                            if (!this.lowerLayer[x][y]) {
                                this.lowerLayer[x][y] = item;
                                ++patchesDrawn;
                                avgPos.x += x;
                                avgPos.y += y;
                            }
                        }
                    } else {
                        // logger.warn("Tried to spawn resource out of chunk");
                    }
                }
            }
        }

        this.patches.push({
            pos: avgPos.divideScalar(patchesDrawn),
            item,
            size: patchSize,
        });
    }

    /** Generates a color patch */
    internalGenerateColorPatch(
        rng: RandomNumberGenerator,
        colorPatchSize: number,
        distanceToOriginInChunks: number
    ) {
        // First, determine available colors
        let availableColors: enumColors[] = [enumColors.red, enumColors.green];
        if (distanceToOriginInChunks > 2) {
            availableColors.push(enumColors.blue);
        }
        this.internalGeneratePatch(rng, colorPatchSize, COLOR_ITEM_SINGLETONS[rng.choice(availableColors)]);
    }

    /** Generates a shape patch */
    internalGenerateShapePatch(
        rng: RandomNumberGenerator,
        shapePatchSize: number,
        distanceToOriginInChunks: number
    ) {
        let subShapes: [enumSubShape, enumSubShape, enumSubShape, enumSubShape] = null;

        let weights = {} as Record<enumSubShape, number>;

        // Later there is a mix of everything
        weights = {
            [enumSubShape.rect]: 100,
            [enumSubShape.circle]: Math.round(50 + clamp(distanceToOriginInChunks * 2, 0, 50)),
            [enumSubShape.star]: Math.round(20 + clamp(distanceToOriginInChunks, 0, 30)),
            [enumSubShape.windmill]: Math.round(6 + clamp(distanceToOriginInChunks / 2, 0, 20)),
        };

        for (const key in MODS_ADDITIONAL_SHAPE_MAP_WEIGHTS) {
            weights[key] = MODS_ADDITIONAL_SHAPE_MAP_WEIGHTS[key](distanceToOriginInChunks);
        }

        if (distanceToOriginInChunks < 7) {
            // Initial chunks can not spawn the good stuff
            weights[enumSubShape.star] = 0;
            weights[enumSubShape.windmill] = 0;
        }

        if (distanceToOriginInChunks < 10) {
            // Initial chunk patches always have the same shape
            const subShape = this.internalGenerateRandomSubShape(rng, weights);
            subShapes = [subShape, subShape, subShape, subShape];
        } else if (distanceToOriginInChunks < 15) {
            // Later patches can also have mixed ones
            const subShapeA = this.internalGenerateRandomSubShape(rng, weights);
            const subShapeB = this.internalGenerateRandomSubShape(rng, weights);
            subShapes = [subShapeA, subShapeA, subShapeB, subShapeB];
        } else {
            // Finally there is a mix of everything
            subShapes = [
                this.internalGenerateRandomSubShape(rng, weights),
                this.internalGenerateRandomSubShape(rng, weights),
                this.internalGenerateRandomSubShape(rng, weights),
                this.internalGenerateRandomSubShape(rng, weights),
            ];
        }

        // Makes sure windmills never spawn as whole
        let windmillCount = 0;
        for (let i = 0; i < subShapes.length; ++i) {
            if (subShapes[i] === enumSubShape.windmill) {
                ++windmillCount;
            }
        }
        if (windmillCount > 1) {
            subShapes[0] = enumSubShape.rect;
            subShapes[1] = enumSubShape.rect;
        }

        const definition = this.root.shapeDefinitionMgr.getDefinitionFromSimpleShapes(subShapes);
        this.internalGeneratePatch(
            rng,
            shapePatchSize,
            this.root.shapeDefinitionMgr.getShapeItemFromDefinition(definition)
        );
    }

    /** Chooses a random shape with the given weights */
    internalGenerateRandomSubShape(
        rng: RandomNumberGenerator,
        weights: Record<enumSubShape, number>
    ): enumSubShape {
        // @ts-ignore
        const sum: number = Object.values(weights).reduce((a, b) => a + b, 0);

        const chosenNumber = rng.nextIntRange(0, sum - 1);
        let accumulated = 0;
        for (const key in weights) {
            const weight = weights[key];
            if (accumulated + weight > chosenNumber) {
                return key as enumSubShape;
            }
            accumulated += weight;
        }

        logger.error("Failed to find matching shape in chunk generation");
        return enumSubShape.circle;
    }

    /** Generates the lower layer "terrain" */
    generateLowerLayer() {
        const rng = new RandomNumberGenerator(this.x + "|" + this.y + "|" + this.root.map.seed);

        if (this.generatePredefined(rng)) {
            return;
        }

        const chunkCenter = new Vector(this.x, this.y).addScalar(0.5);
        const distanceToOriginInChunks = Math.round(chunkCenter.length());

        this.generatePatches({ rng, chunkCenter, distanceToOriginInChunks });
    }

    generatePatches({
        rng,
        chunkCenter,
        distanceToOriginInChunks,
    }: {
        rng: RandomNumberGenerator;
        chunkCenter: Vector;
        distanceToOriginInChunks: number;
    }) {
        // Determine how likely it is that there is a color patch
        const colorPatchChance = 0.9 - clamp(distanceToOriginInChunks / 25, 0, 1) * 0.5;

        if (rng.next() < colorPatchChance / 4) {
            const colorPatchSize = Math.max(2, Math.round(1 + clamp(distanceToOriginInChunks / 8, 0, 4)));
            this.internalGenerateColorPatch(rng, colorPatchSize, distanceToOriginInChunks);
        }

        // Determine how likely it is that there is a shape patch
        const shapePatchChance = 0.9 - clamp(distanceToOriginInChunks / 25, 0, 1) * 0.5;
        if (rng.next() < shapePatchChance / 4) {
            const shapePatchSize = Math.max(2, Math.round(1 + clamp(distanceToOriginInChunks / 8, 0, 4)));
            this.internalGenerateShapePatch(rng, shapePatchSize, distanceToOriginInChunks);
        }
    }

    /**
     * Checks if this chunk has predefined contents, and if so returns true and generates the
     * predefined contents
     */
    generatePredefined(rng: RandomNumberGenerator): boolean {
        if (this.x === 0 && this.y === 0) {
            this.internalGeneratePatch(rng, 2, COLOR_ITEM_SINGLETONS[enumColors.red], 7, 7);
            return true;
        }
        if (this.x === -1 && this.y === 0) {
            const item = this.root.shapeDefinitionMgr.getShapeItemFromShortKey("CuCuCuCu");
            this.internalGeneratePatch(rng, 2, item, globalConfig.mapChunkSize - 9, 7);
            return true;
        }
        if (this.x === 0 && this.y === -1) {
            const item = this.root.shapeDefinitionMgr.getShapeItemFromShortKey("RuRuRuRu");
            this.internalGeneratePatch(rng, 2, item, 5, globalConfig.mapChunkSize - 7);
            return true;
        }

        if (this.x === -1 && this.y === -1) {
            this.internalGeneratePatch(rng, 2, COLOR_ITEM_SINGLETONS[enumColors.green]);
            return true;
        }

        if (this.x === 5 && this.y === -2) {
            const item = this.root.shapeDefinitionMgr.getShapeItemFromShortKey("SuSuSuSu");
            this.internalGeneratePatch(rng, 2, item, 5, globalConfig.mapChunkSize - 7);
            return true;
        }

        return false;
    }

    getLowerLayerFromWorldCoords(worldX: number, worldY: number): BaseItem | null {
        const localX = worldX - this.tileX;
        const localY = worldY - this.tileY;
        assert(localX >= 0, "Local X is < 0");
        assert(localY >= 0, "Local Y is < 0");
        assert(localX < globalConfig.mapChunkSize, "Local X is >= chunk size");
        assert(localY < globalConfig.mapChunkSize, "Local Y is >= chunk size");
        return this.lowerLayer[localX][localY] || null;
    }

    /** Returns the contents of this chunk from the given world space coordinates */
    getTileContentFromWorldCoords(worldX: number, worldY: number): Entity | null {
        const localX = worldX - this.tileX;
        const localY = worldY - this.tileY;
        assert(localX >= 0, "Local X is < 0");
        assert(localY >= 0, "Local Y is < 0");
        assert(localX < globalConfig.mapChunkSize, "Local X is >= chunk size");
        assert(localY < globalConfig.mapChunkSize, "Local Y is >= chunk size");
        return this.contents[localX][localY] || null;
    }

    /** Returns the contents of this chunk from the given world space coordinates */
    getLayerContentFromWorldCoords(worldX: number, worldY: number, layer: Layer): Entity | null {
        const localX = worldX - this.tileX;
        const localY = worldY - this.tileY;
        assert(localX >= 0, "Local X is < 0");
        assert(localY >= 0, "Local Y is < 0");
        assert(localX < globalConfig.mapChunkSize, "Local X is >= chunk size");
        assert(localY < globalConfig.mapChunkSize, "Local Y is >= chunk size");
        if (layer === "regular") {
            return this.contents[localX][localY] || null;
        } else {
            return this.wireContents[localX][localY] || null;
        }
    }
    /** Returns the contents of this chunk from the given world space coordinates */
    getLayersContentsMultipleFromWorldCoords(worldX: number, worldY: number): Array<Entity> {
        const localX = worldX - this.tileX;
        const localY = worldY - this.tileY;
        assert(localX >= 0, "Local X is < 0");
        assert(localY >= 0, "Local Y is < 0");
        assert(localX < globalConfig.mapChunkSize, "Local X is >= chunk size");
        assert(localY < globalConfig.mapChunkSize, "Local Y is >= chunk size");

        const regularContent = this.contents[localX][localY];
        const wireContent = this.wireContents[localX][localY];

        const result = [];
        if (regularContent) {
            result.push(regularContent);
        }
        if (wireContent) {
            result.push(wireContent);
        }
        return result;
    }

    /** Returns the chunks contents from the given local coordinates */
    getTileContentFromLocalCoords(localX: number, localY: number): Entity | null {
        assert(localX >= 0, "Local X is < 0");
        assert(localY >= 0, "Local Y is < 0");
        assert(localX < globalConfig.mapChunkSize, "Local X is >= chunk size");
        assert(localY < globalConfig.mapChunkSize, "Local Y is >= chunk size");

        return this.contents[localX][localY] || null;
    }

    /** Sets the chunks contents */
    setLayerContentFromWorldCords(tileX: number, tileY: number, contents: Entity, layer: Layer) {
        const localX = tileX - this.tileX;
        const localY = tileY - this.tileY;
        assert(localX >= 0, "Local X is < 0");
        assert(localY >= 0, "Local Y is < 0");
        assert(localX < globalConfig.mapChunkSize, "Local X is >= chunk size");
        assert(localY < globalConfig.mapChunkSize, "Local Y is >= chunk size");

        let oldContents;
        if (layer === "regular") {
            oldContents = this.contents[localX][localY];
        } else {
            oldContents = this.wireContents[localX][localY];
        }

        assert(contents === null || !oldContents, "Tile already used: " + tileX + " / " + tileY);

        if (oldContents) {
            // Remove from list (the old contents must be reigstered)
            fastArrayDeleteValueIfContained(this.containedEntities, oldContents);
            fastArrayDeleteValueIfContained(this.containedEntitiesByLayer[layer], oldContents);
        }

        if (layer === "regular") {
            this.contents[localX][localY] = contents;
        } else {
            this.wireContents[localX][localY] = contents;
        }

        if (contents) {
            if (this.containedEntities.indexOf(contents) < 0) {
                this.containedEntities.push(contents);
            }

            if (this.containedEntitiesByLayer[layer].indexOf(contents) < 0) {
                this.containedEntitiesByLayer[layer].push(contents);
            }
        }
    }
}
