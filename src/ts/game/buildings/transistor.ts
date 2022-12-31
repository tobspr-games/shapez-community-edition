import { generateMatrixRotations } from "../../core/utils";
import { enumDirection, Vector } from "../../core/vector";
import { enumLogicGateType, LogicGateComponent } from "../components/logic_gate";
import { enumPinSlotType, WiredPinsComponent } from "../components/wired_pins";
import { Entity } from "../entity";
import { defaultBuildingVariant, MetaBuilding } from "../meta_building";
import { GameRoot } from "../root";
import { enumHubGoalRewards } from "../tutorial_goals";

/**
 @enum 
*/
export const enumTransistorVariants = {
    mirrored: "mirrored",
};

const overlayMatrices = {
    [defaultBuildingVariant]: generateMatrixRotations([0, 1, 0, 1, 1, 0, 0, 1, 0]),
    [enumTransistorVariants.mirrored]: generateMatrixRotations([0, 1, 0, 0, 1, 1, 0, 1, 0]),
};

export class MetaTransistorBuilding extends MetaBuilding {
    constructor() {
        super("transistor");
    }

    static getAllVariantCombinations() {
        return [
            {
                internalId: 38,
                variant: defaultBuildingVariant,
            },
            {
                internalId: 60,
                variant: enumTransistorVariants.mirrored,
            },
        ];
    }

    getSilhouetteColor() {
        return "#bc3a61";
    }

    getIsUnlocked(root: GameRoot) {
        return root.hubGoals.isRewardUnlocked(enumHubGoalRewards.reward_logic_gates);
    }

    /**
 @returns *
*/
    getLayer(): "wires" {
        return "wires";
    }

    getDimensions() {
        return new Vector(1, 1);
    }

    getAvailableVariants() {
        return [defaultBuildingVariant, enumTransistorVariants.mirrored];
    }

    getSpecialOverlayRenderMatrix(rotation, rotationVariant, variant) {
        return overlayMatrices[variant][rotation];
    }

    getRenderPins() {
        // We already have it included
        return false;
    }

    updateVariants(entity: Entity, rotationVariant: number, variant) {
        entity.components.WiredPins.slots[1].direction =
            variant === enumTransistorVariants.mirrored ? enumDirection.right : enumDirection.left;
    }

    /** Creates the entity at the given location */
    setupEntityComponents(entity: Entity) {
        entity.addComponent(
            new WiredPinsComponent({
                slots: [
                    {
                        pos: new Vector(0, 0),
                        direction: enumDirection.top,
                        type: enumPinSlotType.logicalEjector,
                    },
                    {
                        pos: new Vector(0, 0),
                        direction: enumDirection.left,
                        type: enumPinSlotType.logicalAcceptor,
                    },
                    {
                        pos: new Vector(0, 0),
                        direction: enumDirection.bottom,
                        type: enumPinSlotType.logicalAcceptor,
                    },
                ],
            })
        );

        entity.addComponent(
            new LogicGateComponent({
                type: enumLogicGateType.transistor,
            })
        );
    }
}
