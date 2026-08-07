import { BUILDING_IDS } from "@/game/building_identifiers";
import { HUDBaseToolbar } from "./base_toolbar";

export class HUDBuildingsToolbar extends HUDBaseToolbar {
    constructor(root) {
        super(root, {
            primaryBuildings: [
                BUILDING_IDS.constantProducer,
                BUILDING_IDS.goalAcceptor,
                BUILDING_IDS.belt,
                BUILDING_IDS.balancer,
                BUILDING_IDS.undergroundBelt,
                BUILDING_IDS.miner,
                BUILDING_IDS.block,
                BUILDING_IDS.cutter,
                BUILDING_IDS.rotator,
                BUILDING_IDS.stacker,
                BUILDING_IDS.mixer,
                BUILDING_IDS.painter,
                BUILDING_IDS.trash,
                BUILDING_IDS.itemProducer,
            ],
            secondaryBuildings: [
                BUILDING_IDS.storage,
                BUILDING_IDS.reader,
                BUILDING_IDS.lever,
                BUILDING_IDS.filter,
                BUILDING_IDS.display,
            ],
            visibilityCondition: () =>
                !this.root.camera.getIsMapOverlayActive() && this.root.currentLayer === "regular",
            htmlElementId: "ingame_HUD_BuildingsToolbar",
        });
    }
}
