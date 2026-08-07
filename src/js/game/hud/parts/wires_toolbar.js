import { BUILDING_IDS } from "@/game/building_identifiers";
import { HUDBaseToolbar } from "./base_toolbar";

export class HUDWiresToolbar extends HUDBaseToolbar {
    constructor(root) {
        super(root, {
            primaryBuildings: [
                BUILDING_IDS.wire,
                BUILDING_IDS.wireTunnel,
                BUILDING_IDS.constantSignal,
                BUILDING_IDS.logicGate,
                BUILDING_IDS.virtualProcessor,
                BUILDING_IDS.analyzer,
                BUILDING_IDS.comparator,
                BUILDING_IDS.transistor,
            ],
            secondaryBuildings: [
                BUILDING_IDS.storage,
                BUILDING_IDS.reader,
                BUILDING_IDS.lever,
                BUILDING_IDS.filter,
                BUILDING_IDS.display,
            ],
            visibilityCondition: () =>
                !this.root.camera.getIsMapOverlayActive() && this.root.currentLayer === "wires",
            htmlElementId: "ingame_HUD_wires_toolbar",
            layer: "wires",
        });
    }
}
