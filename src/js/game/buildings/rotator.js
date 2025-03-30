import { formatItemsPerSecond, generateMatrixRotations } from "../../core/utils";
import { enumDirection, Vector } from "../../core/vector";
import { T } from "../../translations";
import { ItemAcceptorComponent } from "../components/item_acceptor";
import { ItemEjectorComponent } from "../components/item_ejector";
import { enumItemProcessorTypes, ItemProcessorComponent } from "../components/item_processor";
import { Entity } from "../entity";
import { defaultBuildingVariant, MetaBuilding } from "../meta_building";
import { GameRoot } from "../root";
import { enumHubGoalRewards } from "../tutorial_goals";

/** @enum {string} */
export const enumRotatorVariants = { ccw: "ccw", rotate180: "rotate180" };

const overlayMatrices = {
    [defaultBuildingVariant]: generateMatrixRotations([0, 1, 1, 1, 1, 0, 0, 1, 1]),
    [enumRotatorVariants.ccw]: generateMatrixRotations([1, 1, 0, 0, 1, 1, 1, 1, 0]),
    [enumRotatorVariants.rotate180]: generateMatrixRotations([1, 1, 0, 1, 1, 1, 0, 1, 1]),
};

export class MetaRotatorBuilding extends MetaBuilding {
    constructor() {
        super("rotator");
    }

    static getAllVariantCombinations() {
        return [
            {
                internalId: 11,
                variant: defaultBuildingVariant,
            },
            {
                internalId: 12,
                variant: enumRotatorVariants.ccw,
            },
            {
                internalId: 13,
                variant: enumRotatorVariants.rotate180,
            },
        ];
    }

    getSilhouetteColor() {
        return "#7dc6cd";
    }

    /**
     * @param {number} rotation
     * @param {number} rotationVariant
     * @param {string} variant
     * @param {Entity} entity
     * @returns {Array<number>|null}
     */
    getSpecialOverlayRenderMatrix(rotation, rotationVariant, variant, entity) {
        const matrix = overlayMatrices[variant];
        if (matrix) {
            return matrix[rotation];
        }
        return null;
    }

    /**
     * @param {GameRoot} root
     * @param {string} variant
     * @returns {Array<[string, string]>}
     */
    getAdditionalStatistics(root, variant) {
        if (root.gameMode.throughputDoesNotMatter()) {
            return [];
        }
        switch (variant) {
            case defaultBuildingVariant: {
                const speed = root.hubGoals.getProcessorBaseSpeed(enumItemProcessorTypes.rotator);
                return [[T.ingame.buildingPlacement.infoTexts.speed, formatItemsPerSecond(speed)]];
            }
            case enumRotatorVariants.ccw: {
                const speed = root.hubGoals.getProcessorBaseSpeed(enumItemProcessorTypes.rotatorCCW);
                return [[T.ingame.buildingPlacement.infoTexts.speed, formatItemsPerSecond(speed)]];
            }
            case enumRotatorVariants.rotate180: {
                const speed = root.hubGoals.getProcessorBaseSpeed(enumItemProcessorTypes.rotator180);
                return [[T.ingame.buildingPlacement.infoTexts.speed, formatItemsPerSecond(speed)]];
            }
        }
    }

    /**
     *
     * @param {GameRoot} root
     */
    getAvailableVariants(root) {
        let variants = [defaultBuildingVariant];
        if (root.hubGoals.isRewardUnlocked(enumHubGoalRewards.reward_rotator_ccw)) {
            variants.push(enumRotatorVariants.ccw);
        }
        if (root.hubGoals.isRewardUnlocked(enumHubGoalRewards.reward_rotator_180)) {
            variants.push(enumRotatorVariants.rotate180);
        }
        return variants;
    }

    /**
     * @param {GameRoot} root
     */
    getIsUnlocked(root) {
        return root.hubGoals.isRewardUnlocked(enumHubGoalRewards.reward_rotator);
    }

    /**
     * Creates the entity at the given location
     * @param {Entity} entity
     */
    setupEntityComponents(entity) {
        entity.addComponent(
            new ItemProcessorComponent({
                inputsPerCharge: 1,
                processorType: enumItemProcessorTypes.rotator,
            })
        );

        entity.addComponent(
            new ItemEjectorComponent({
                slots: [{ pos: new Vector(0, 0), direction: enumDirection.top }],
            })
        );
        entity.addComponent(
            new ItemAcceptorComponent({
                slots: [
                    {
                        pos: new Vector(0, 0),
                        direction: enumDirection.bottom,
                        filter: "shape",
                    },
                ],
            })
        );
    }

    /**
     *
     * @param {Entity} entity
     * @param {number} rotationVariant
     * @param {string} variant
     */
    updateVariants(entity, rotationVariant, variant) {
        switch (variant) {
            case defaultBuildingVariant: {
                entity.components.ItemProcessor.type = enumItemProcessorTypes.rotator;
                break;
            }
            case enumRotatorVariants.ccw: {
                entity.components.ItemProcessor.type = enumItemProcessorTypes.rotatorCCW;
                break;
            }
            case enumRotatorVariants.rotate180: {
                entity.components.ItemProcessor.type = enumItemProcessorTypes.rotator180;
                break;
            }
            default:
                assertAlways(false, "Unknown rotator variant: " + variant);
        }
    }
}
