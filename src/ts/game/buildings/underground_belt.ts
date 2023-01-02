import { Loader } from "../../core/loader";
import { enumDirection, Vector, enumAngleToDirection, enumDirectionToVector } from "../../core/vector";
import { ItemAcceptorComponent } from "../components/item_acceptor";
import { ItemEjectorComponent } from "../components/item_ejector";
import { enumUndergroundBeltMode, UndergroundBeltComponent } from "../components/underground_belt";
import { Entity } from "../entity";
import { MetaBuilding, defaultBuildingVariant } from "../meta_building";
import { GameRoot } from "../root";
import { globalConfig } from "../../core/config";
import { enumHubGoalRewards } from "../tutorial_goals";
import { formatItemsPerSecond, generateMatrixRotations } from "../../core/utils";
import { T } from "../../translations";

/**
 @enum
*/
export const arrayUndergroundRotationVariantToMode = [
    enumUndergroundBeltMode.sender,
    enumUndergroundBeltMode.receiver,
];

/**
 @enum
*/
export const enumUndergroundBeltVariants = { tier2: "tier2" } as const;
export type enumUndergroundBeltVariants = keyof typeof enumUndergroundBeltVariants

export const enumUndergroundBeltVariantToTier = {
    [defaultBuildingVariant]: 0,
    [enumUndergroundBeltVariants.tier2]: 1,
};

const colorsByRotationVariant = ["#6d9dff", "#71ff9c"];

const overlayMatrices = [
    // Sender
    generateMatrixRotations([1, 1, 1, 0, 1, 0, 0, 1, 0]),

    // Receiver
    generateMatrixRotations([0, 1, 0, 0, 1, 0, 1, 1, 1]),
];

export class MetaUndergroundBeltBuilding extends MetaBuilding {
    constructor() {
        super("underground_belt");
    }

    static getAllVariantCombinations() {
        return [
            {
                internalId: 22,
                variant: defaultBuildingVariant,
                rotationVariant: 0,
            },
            {
                internalId: 23,
                variant: defaultBuildingVariant,
                rotationVariant: 1,
            },
            {
                internalId: 24,
                variant: enumUndergroundBeltVariants.tier2,
                rotationVariant: 0,
            },
            {
                internalId: 25,
                variant: enumUndergroundBeltVariants.tier2,
                rotationVariant: 1,
            },
        ];
    }

    getSilhouetteColor(variant, rotationVariant) {
        return colorsByRotationVariant[rotationVariant];
    }

    getFlipOrientationAfterPlacement() {
        return true;
    }

    getStayInPlacementMode() {
        return true;
    }

    getSpecialOverlayRenderMatrix(
        rotation: number,
        rotationVariant: number,
        variant: string,
        entity: Entity
    ) {
        return overlayMatrices[rotationVariant][rotation];
    }

    getAdditionalStatistics(root: GameRoot, variant: string): Array<[string, string]> {
        const rangeTiles =
            globalConfig.undergroundBeltMaxTilesByTier[enumUndergroundBeltVariantToTier[variant]];

        const beltSpeed = root.hubGoals.getUndergroundBeltBaseSpeed();

        const stats: Array<[string, string]> = [
            [
                T.ingame.buildingPlacement.infoTexts.range,
                T.ingame.buildingPlacement.infoTexts.tiles.replace("<x>", "" + rangeTiles),
            ],
        ];

        if (root.gameMode.throughputDoesNotMatter()) {
            return stats;
        }
        stats.push([T.ingame.buildingPlacement.infoTexts.speed, formatItemsPerSecond(beltSpeed)]);

        return stats;
    }

    getAvailableVariants(root: GameRoot) {
        if (root.hubGoals.isRewardUnlocked(enumHubGoalRewards.reward_underground_belt_tier_2)) {
            return [defaultBuildingVariant, enumUndergroundBeltVariants.tier2];
        }
        return super.getAvailableVariants(root);
    }

    getPreviewSprite(rotationVariant: number, variant: string) {
        let suffix = "";
        if (variant !== defaultBuildingVariant) {
            suffix = "-" + variant;
        }

        switch (arrayUndergroundRotationVariantToMode[rotationVariant]) {
            case enumUndergroundBeltMode.sender:
                return Loader.getSprite("sprites/buildings/underground_belt_entry" + suffix + ".png");
            case enumUndergroundBeltMode.receiver:
                return Loader.getSprite("sprites/buildings/underground_belt_exit" + suffix + ".png");
            default:
                assertAlways(false, "Invalid rotation variant");
        }
    }

    getBlueprintSprite(rotationVariant: number, variant: string) {
        let suffix = "";
        if (variant !== defaultBuildingVariant) {
            suffix = "-" + variant;
        }

        switch (arrayUndergroundRotationVariantToMode[rotationVariant]) {
            case enumUndergroundBeltMode.sender:
                return Loader.getSprite("sprites/blueprints/underground_belt_entry" + suffix + ".png");
            case enumUndergroundBeltMode.receiver:
                return Loader.getSprite("sprites/blueprints/underground_belt_exit" + suffix + ".png");
            default:
                assertAlways(false, "Invalid rotation variant");
        }
    }

    getSprite(rotationVariant: number, variant: string) {
        return this.getPreviewSprite(rotationVariant, variant);
    }

    getIsUnlocked(root: GameRoot) {
        return root.hubGoals.isRewardUnlocked(enumHubGoalRewards.reward_tunnel);
    }

    /** Creates the entity at the given location */
    setupEntityComponents(entity: Entity) {
        // Required, since the item processor needs this.
        entity.addComponent(
            new ItemEjectorComponent({
                slots: [],
            })
        );

        entity.addComponent(new UndergroundBeltComponent({}));
        entity.addComponent(
            new ItemAcceptorComponent({
                slots: [],
            })
        );
    }

    /**
     * Should compute the optimal rotation variant on the given tile
     * @return
     */
    computeOptimalDirectionAndRotationVariantAtTile({
        root,
        tile,
        rotation,
        variant,
        layer,
    }: {
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
        const searchDirection = enumAngleToDirection[rotation];
        const searchVector = enumDirectionToVector[searchDirection];
        const tier = enumUndergroundBeltVariantToTier[variant];

        const targetRotation = (rotation + 180) % 360;
        const targetSenderRotation = rotation;

        for (
            let searchOffset = 1;
            searchOffset <= globalConfig.undergroundBeltMaxTilesByTier[tier];
            ++searchOffset
        ) {
            tile = tile.addScalars(searchVector.x, searchVector.y);

            const contents = root.map.getTileContent(tile, "regular");
            if (contents) {
                const undergroundComp = contents.components.UndergroundBelt;
                if (undergroundComp && undergroundComp.tier === tier) {
                    const staticComp = contents.components.StaticMapEntity;
                    if (staticComp.rotation === targetRotation) {
                        if (undergroundComp.mode !== enumUndergroundBeltMode.sender) {
                            // If we encounter an underground receiver on our way which is also faced in our direction, we don't accept that
                            break;
                        }
                        return {
                            rotation: targetRotation,
                            rotationVariant: 1,
                            connectedEntities: [contents],
                        };
                    } else if (staticComp.rotation === targetSenderRotation) {
                        // Draw connections to receivers
                        if (undergroundComp.mode === enumUndergroundBeltMode.receiver) {
                            return {
                                rotation: rotation,
                                rotationVariant: 0,
                                connectedEntities: [contents],
                            };
                        } else {
                            break;
                        }
                    }
                }
            }
        }

        return {
            rotation,
            rotationVariant: 0,
        };
    }

    updateVariants(entity: Entity, rotationVariant: number, variant: string) {
        entity.components.UndergroundBelt.tier = enumUndergroundBeltVariantToTier[variant];

        switch (arrayUndergroundRotationVariantToMode[rotationVariant]) {
            case enumUndergroundBeltMode.sender: {
                entity.components.UndergroundBelt.mode = enumUndergroundBeltMode.sender;
                entity.components.ItemEjector.setSlots([]);
                entity.components.ItemAcceptor.setSlots([
                    {
                        pos: new Vector(0, 0),
                        direction: enumDirection.bottom,
                    },
                ]);
                return;
            }
            case enumUndergroundBeltMode.receiver: {
                entity.components.UndergroundBelt.mode = enumUndergroundBeltMode.receiver;
                entity.components.ItemAcceptor.setSlots([]);
                entity.components.ItemEjector.setSlots([
                    {
                        pos: new Vector(0, 0),
                        direction: enumDirection.top,
                    },
                ]);
                return;
            }
            default:
                assertAlways(false, "Invalid rotation variant");
        }
    }
}
