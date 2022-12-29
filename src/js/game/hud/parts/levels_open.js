import { Vector } from "../../../core/vector";
import { enumMouseButton } from "../../camera";
import { BaseHUDPart } from "../base_hud_part";

export class HUDLevelsOpen extends BaseHUDPart {
    initialize() {
        this.root.camera.downPreHandler.add(this.downPreHandler, this);
    }

    /**
     * @param {Vector} pos
     * @param {enumMouseButton} button
     */
    downPreHandler(pos, button) {
        const tile = this.root.camera.screenToWorld(pos).toTileSpace();
        const contents = this.root.map.getLayerContentXY(tile.x, tile.y, "regular");
        if (contents) {
            const hubComp = contents.components.Hub;
            if (hubComp) {
                this.root.hud.parts.levels.show();
                this.root.soundProxy.playUiClick();
            }
        }
    }
}
