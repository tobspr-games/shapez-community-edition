import { generateMatrixRotations } from "../../core/utils";
import { Vector } from "../../core/vector";
import { WireTunnelComponent } from "../components/wire_tunnel";
import { Entity } from "../entity";
import { defaultBuildingVariant, MetaBuilding } from "../meta_building";
import { GameRoot } from "../root";
import { enumHubGoalRewards } from "../tutorial_goals";
const wireTunnelOverlayMatrix = generateMatrixRotations([0, 1, 0, 1, 1, 1, 0, 1, 0]);
export class MetaWireTunnelBuilding extends MetaBuilding {

    constructor() {
        super("wire_tunnel");
    }
    static getAllVariantCombinations() {
        return [
            {
                internalId: 39,
                variant: defaultBuildingVariant,
            },
        ];
    }
    getSilhouetteColor() {
        return "#777a86";
    }
        getIsUnlocked(root: GameRoot) {
        return root.hubGoals.isRewardUnlocked(enumHubGoalRewards.reward_wires_painter_and_levers);
    }
        getSpecialOverlayRenderMatrix(rotation: number, rotationVariant: number, variant: string, entity: Entity) {
        return wireTunnelOverlayMatrix[rotation];
    }
    getIsRotateable() {
        return false;
    }
    getDimensions() {
        return new Vector(1, 1);
    }
    /** {} **/
    getLayer(): "wires" {
        return "wires";
    }
    /**
     * Creates the entity at the given location
     */
    setupEntityComponents(entity: Entity) {
        entity.addComponent(new WireTunnelComponent());
    }
}
