/* typehints:start */
import { GameRoot } from "../root";
/* typehints:end */

import { BUILDING_IDS } from "../building_identifiers";
import { enumGameModeIds } from "../game_mode";
import { HUDConstantSignalEdit } from "../hud/parts/constant_signal_edit";
import { HUDPuzzleEditorControls } from "../hud/parts/puzzle_editor_controls";
import { HUDPuzzleEditorReview } from "../hud/parts/puzzle_editor_review";
import { HUDPuzzleEditorSettings } from "../hud/parts/puzzle_editor_settings";
import { PuzzleGameMode } from "./puzzle";

export class PuzzleEditGameMode extends PuzzleGameMode {
    static getId() {
        return enumGameModeIds.puzzleEdit;
    }

    static getSchema() {
        return {};
    }

    /** @param {GameRoot} root */
    constructor(root) {
        super(root);

        this.hiddenBuildings = [
            BUILDING_IDS.storage,
            BUILDING_IDS.reader,
            BUILDING_IDS.filter,
            BUILDING_IDS.display,
            BUILDING_IDS.lever,
            BUILDING_IDS.itemProducer,
            BUILDING_IDS.miner,

            BUILDING_IDS.wire,
            BUILDING_IDS.wireTunnel,
            BUILDING_IDS.constantSignal,
            BUILDING_IDS.logicGate,
            BUILDING_IDS.virtualProcessor,
            BUILDING_IDS.analyzer,
            BUILDING_IDS.comparator,
            BUILDING_IDS.transistor,
        ];

        this.additionalHudParts.puzzleEditorControls = HUDPuzzleEditorControls;
        this.additionalHudParts.puzzleEditorReview = HUDPuzzleEditorReview;
        this.additionalHudParts.puzzleEditorSettings = HUDPuzzleEditorSettings;
        this.additionalHudParts.constantSignalEdit = HUDConstantSignalEdit;
    }

    getIsEditor() {
        return true;
    }
}
