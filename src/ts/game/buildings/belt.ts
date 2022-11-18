import { Loader } from "../../core/loader";
import { formatItemsPerSecond, generateMatrixRotations } from "../../core/utils";
import { enumAngleToDirection, enumDirection, Vector } from "../../core/vector";
import { SOUNDS } from "../../platform/sound";
import { T } from "../../translations";
import { BeltComponent } from "../components/belt";
import { Entity } from "../entity";
import { defaultBuildingVariant, MetaBuilding } from "../meta_building";
import { GameRoot } from "../root";
import { THEME } from "../theme";
export const arrayBeltVariantToRotation = [enumDirection.top, enumDirection.left, enumDirection.right];
export const beltOverlayMatrices = {
    [enumDirection.top]: generateMatrixRotations([0, 1, 0, 0, 1, 0, 0, 1, 0]),
    [enumDirection.left]: generateMatrixRotations([0, 0, 0, 1, 1, 0, 0, 1, 0]),
    [enumDirection.right]: generateMatrixRotations([0, 0, 0, 0, 1, 1, 0, 1, 0]),
};
export class MetaBeltBuilding extends MetaBuilding {

    constructor() {
        super("belt");
    }
    static getAllVariantCombinations() {
        return [
            {
                internalId: 1,
                variant: defaultBuildingVariant,
                rotationVariant: 0,
            },
            {
                internalId: 2,
                variant: defaultBuildingVariant,
                rotationVariant: 1,
            },
            {
                internalId: 3,
                variant: defaultBuildingVariant,
                rotationVariant: 2,
            },
        ];
    }
    getSilhouetteColor() {
        return THEME.map.chunkOverview.beltColor;
    }
    getPlacementSound() {
        return SOUNDS.placeBelt;
    }
    getHasDirectionLockAvailable() {
        return true;
    }
    getStayInPlacementMode() {
        return true;
    }
    getRotateAutomaticallyWhilePlacing() {
        return true;
    }
    getSprite() {
        return null;
    }
    getIsReplaceable() {
        return true;
    }
    /**
     * {}
     */
    getAdditionalStatistics(root: GameRoot, variant: string): Array<[
        string,
        string
    ]> {
        if (root.gameMode.throughputDoesNotMatter()) {
            return [];
        }
        const beltSpeed = root.hubGoals.getBeltBaseSpeed();
        return [[T.ingame.buildingPlacement.infoTexts.speed, formatItemsPerSecond(beltSpeed)]];
    }
    getPreviewSprite(rotationVariant) {
        switch (arrayBeltVariantToRotation[rotationVariant]) {
            case enumDirection.top: {
                return Loader.getSprite("sprites/buildings/belt_top.png");
            }
            case enumDirection.left: {
                return Loader.getSprite("sprites/buildings/belt_left.png");
            }
            case enumDirection.right: {
                return Loader.getSprite("sprites/buildings/belt_right.png");
            }
            default: {
                assertAlways(false, "Invalid belt rotation variant");
            }
        }
    }
    getBlueprintSprite(rotationVariant) {
        switch (arrayBeltVariantToRotation[rotationVariant]) {
            case enumDirection.top: {
                return Loader.getSprite("sprites/blueprints/belt_top.png");
            }
            case enumDirection.left: {
                return Loader.getSprite("sprites/blueprints/belt_left.png");
            }
            case enumDirection.right: {
                return Loader.getSprite("sprites/blueprints/belt_right.png");
            }
            default: {
                assertAlways(false, "Invalid belt rotation variant");
            }
        }
    }
        getSpecialOverlayRenderMatrix(rotation: number, rotationVariant: number, variant: string, entity: Entity) {
        return beltOverlayMatrices[entity.components.Belt.direction][rotation];
    }
    /**
     * Creates the entity at the given location
     */
    setupEntityComponents(entity: Entity) {
        entity.addComponent(new BeltComponent({
            direction: enumDirection.top, // updated later
        }));
    }
        updateVariants(entity: Entity, rotationVariant: number) {
        entity.components.Belt.direction = arrayBeltVariantToRotation[rotationVariant];
    }
    /**
     * Should compute the optimal rotation variant on the given tile
     * @return {{ rotation: number, rotationVariant: number, connectedEntities?: Array<Entity> }}
     */
    computeOptimalDirectionAndRotationVariantAtTile({ root, tile, rotation, variant, layer }: {
        root: GameRoot;
        tile: Vector;
        rotation: number;
        variant: string;
        layer: Layer;
    }): {
        rotation: number;
        rotationVariant: number;
        connectedEntities?: Array<Entity>;
    } {
        const topDirection = enumAngleToDirection[rotation];
        const rightDirection = enumAngleToDirection[(rotation + 90) % 360];
        const bottomDirection = enumAngleToDirection[(rotation + 180) % 360];
        const leftDirection = enumAngleToDirection[(rotation + 270) % 360];
        const { ejectors, acceptors } = root.logic.getEjectorsAndAcceptorsAtTile(tile);
        let hasBottomEjector = false;
        let hasRightEjector = false;
        let hasLeftEjector = false;
        let hasTopAcceptor = false;
        let hasLeftAcceptor = false;
        let hasRightAcceptor = false;
        // Check all ejectors
        for (let i = 0; i < ejectors.length; ++i) {
            const ejector = ejectors[i];
            if (ejector.toDirection === topDirection) {
                hasBottomEjector = true;
            }
            else if (ejector.toDirection === leftDirection) {
                hasRightEjector = true;
            }
            else if (ejector.toDirection === rightDirection) {
                hasLeftEjector = true;
            }
        }
        // Check all acceptors
        for (let i = 0; i < acceptors.length; ++i) {
            const acceptor = acceptors[i];
            if (acceptor.fromDirection === bottomDirection) {
                hasTopAcceptor = true;
            }
            else if (acceptor.fromDirection === rightDirection) {
                hasLeftAcceptor = true;
            }
            else if (acceptor.fromDirection === leftDirection) {
                hasRightAcceptor = true;
            }
        }
        // Soo .. if there is any ejector below us we always prioritize
        // this ejector
        if (!hasBottomEjector) {
            // When something ejects to us from the left and nothing from the right,
            // do a curve from the left to the top
            if (hasRightEjector && !hasLeftEjector) {
                return {
                    rotation: (rotation + 270) % 360,
                    rotationVariant: 2,
                };
            }
            // When something ejects to us from the right and nothing from the left,
            // do a curve from the right to the top
            if (hasLeftEjector && !hasRightEjector) {
                return {
                    rotation: (rotation + 90) % 360,
                    rotationVariant: 1,
                };
            }
        }
        // When there is a top acceptor, ignore sides
        // NOTICE: This makes the belt prefer side turns *way* too much!
        if (!hasTopAcceptor) {
            // When there is an acceptor to the right but no acceptor to the left,
            // do a turn to the right
            if (hasRightAcceptor && !hasLeftAcceptor) {
                return {
                    rotation,
                    rotationVariant: 2,
                };
            }
            // When there is an acceptor to the left but no acceptor to the right,
            // do a turn to the left
            if (hasLeftAcceptor && !hasRightAcceptor) {
                return {
                    rotation,
                    rotationVariant: 1,
                };
            }
        }
        return {
            rotation,
            rotationVariant: 0,
        };
    }
}
