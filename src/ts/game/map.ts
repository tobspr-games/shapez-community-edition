import { globalConfig } from "../core/config";
import { Vector } from "../core/vector";
import { BasicSerializableObject, types } from "../savegame/serialization";
import { BaseItem } from "./base_item";
import { Entity } from "./entity";
import { MapChunkAggregate } from "./map_chunk_aggregate";
import { MapChunkView } from "./map_chunk_view";
import { GameRoot } from "./root";

export class BaseMap extends BasicSerializableObject {
    static getId() {
        return "Map";
    }

    static getSchema() {
        return {
            seed: types.uint,
        };
    }

    public seed = 0;

    /** Mapping of 'X|Y' to chunk * */
    public chunksById: Map<string, MapChunkView> = new Map();

    /** Mapping of 'X|Y' to chunk aggregate * */
    public aggregatesById: Map<string, MapChunkAggregate> = new Map();

    constructor(public root: GameRoot) {
        super();
    }

    /** Returns the given chunk by index */
    getChunk(chunkX: number, chunkY: number, createIfNotExistent = false) {
        const chunkIdentifier = chunkX + "|" + chunkY;
        let storedChunk;

        if ((storedChunk = this.chunksById.get(chunkIdentifier))) {
            return storedChunk;
        }

        if (createIfNotExistent) {
            const instance = new MapChunkView(this.root, chunkX, chunkY);
            this.chunksById.set(chunkIdentifier, instance);
            return instance;
        }

        return null;
    }

    /** Returns the chunk aggregate containing a given chunk */
    getAggregateForChunk(chunkX: number, chunkY: number, createIfNotExistent = false) {
        const aggX = Math.floor(chunkX / globalConfig.chunkAggregateSize);
        const aggY = Math.floor(chunkY / globalConfig.chunkAggregateSize);
        return this.getAggregate(aggX, aggY, createIfNotExistent);
    }

    /** Returns the given chunk aggregate by index */
    getAggregate(aggX: number, aggY: number, createIfNotExistent = false) {
        const aggIdentifier = aggX + "|" + aggY;
        let storedAggregate;

        if ((storedAggregate = this.aggregatesById.get(aggIdentifier))) {
            return storedAggregate;
        }

        if (createIfNotExistent) {
            const instance = new MapChunkAggregate(this.root, aggX, aggY);
            this.aggregatesById.set(aggIdentifier, instance);
            return instance;
        }

        return null;
    }

    /** Gets or creates a new chunk if not existent for the given tile */
    getOrCreateChunkAtTile(tileX: number, tileY: number): MapChunkView {
        const chunkX = Math.floor(tileX / globalConfig.mapChunkSize);
        const chunkY = Math.floor(tileY / globalConfig.mapChunkSize);
        return this.getChunk(chunkX, chunkY, true);
    }

    /** Gets a chunk if not existent for the given tile */
    getChunkAtTileOrNull(tileX: number, tileY: number): MapChunkView | null {
        const chunkX = Math.floor(tileX / globalConfig.mapChunkSize);
        const chunkY = Math.floor(tileY / globalConfig.mapChunkSize);
        return this.getChunk(chunkX, chunkY, false);
    }

    /** Checks if a given tile is within the map bounds */
    isValidTile(tile: Vector): boolean {
        if (G_IS_DEV) {
            assert(tile instanceof Vector, "tile is not a vector");
        }
        return Number.isInteger(tile.x) && Number.isInteger(tile.y);
    }

    /**
     * Returns the tile content of a given tile
     * @returns Entity or null
     */
    getTileContent(tile: Vector, layer: Layer): Entity {
        if (G_IS_DEV) {
            this.internalCheckTile(tile);
        }
        const chunk = this.getChunkAtTileOrNull(tile.x, tile.y);
        return chunk && chunk.getLayerContentFromWorldCoords(tile.x, tile.y, layer);
    }

    /** Returns the lower layers content of the given tile */
    getLowerLayerContentXY(x: number, y: number): BaseItem | null {
        return this.getOrCreateChunkAtTile(x, y).getLowerLayerFromWorldCoords(x, y);
    }

    /**
     * Returns the tile content of a given tile
     * @returns Entity or null
     */
    getLayerContentXY(x: number, y: number, layer: Layer): Entity {
        const chunk = this.getChunkAtTileOrNull(x, y);
        return chunk && chunk.getLayerContentFromWorldCoords(x, y, layer);
    }

    /**
     * Returns the tile contents of a given tile
     * @returns Entity or null
     */
    getLayersContentsMultipleXY(x: number, y: number): Array<Entity> {
        const chunk = this.getChunkAtTileOrNull(x, y);
        if (!chunk) {
            return [];
        }
        return chunk.getLayersContentsMultipleFromWorldCoords(x, y);
    }

    /** Checks if the tile is used */
    isTileUsed(tile: Vector, layer: Layer): boolean {
        if (G_IS_DEV) {
            this.internalCheckTile(tile);
        }
        const chunk = this.getChunkAtTileOrNull(tile.x, tile.y);
        return chunk && chunk.getLayerContentFromWorldCoords(tile.x, tile.y, layer) != null;
    }

    /** Checks if the tile is used */
    isTileUsedXY(x: number, y: number, layer: Layer): boolean {
        const chunk = this.getChunkAtTileOrNull(x, y);
        return chunk && chunk.getLayerContentFromWorldCoords(x, y, layer) != null;
    }

    /** Sets the tiles content */
    setTileContent(tile: Vector, entity: Entity) {
        if (G_IS_DEV) {
            this.internalCheckTile(tile);
        }

        this.getOrCreateChunkAtTile(tile.x, tile.y).setLayerContentFromWorldCords(
            tile.x,
            tile.y,
            entity,
            entity.layer
        );

        const staticComponent = entity.components.StaticMapEntity;
        assert(staticComponent, "Can only place static map entities in tiles");
    }

    /** Places an entity with the StaticMapEntity component */
    placeStaticEntity(entity: Entity) {
        assert(entity.components.StaticMapEntity, "Entity is not static");
        const staticComp = entity.components.StaticMapEntity;
        const rect = staticComp.getTileSpaceBounds();
        for (let dx = 0; dx < rect.w; ++dx) {
            for (let dy = 0; dy < rect.h; ++dy) {
                const x = rect.x + dx;
                const y = rect.y + dy;
                this.getOrCreateChunkAtTile(x, y).setLayerContentFromWorldCords(x, y, entity, entity.layer);
            }
        }
    }

    /** Removes an entity with the StaticMapEntity component */
    removeStaticEntity(entity: Entity) {
        assert(entity.components.StaticMapEntity, "Entity is not static");
        const staticComp = entity.components.StaticMapEntity;
        const rect = staticComp.getTileSpaceBounds();
        for (let dx = 0; dx < rect.w; ++dx) {
            for (let dy = 0; dy < rect.h; ++dy) {
                const x = rect.x + dx;
                const y = rect.y + dy;
                this.getOrCreateChunkAtTile(x, y).setLayerContentFromWorldCords(x, y, null, entity.layer);
            }
        }
    }

    // Internal

    /** Checks a given tile for validty */
    internalCheckTile(tile: Vector) {
        assert(tile instanceof Vector, "tile is not a vector: " + tile);
        assert(tile.x % 1 === 0, "Tile X is not a valid integer: " + tile.x);
        assert(tile.y % 1 === 0, "Tile Y is not a valid integer: " + tile.y);
    }
}
