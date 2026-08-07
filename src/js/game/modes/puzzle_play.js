/* typehints:start */
import { GameRoot } from "../root";
/* typehints:end */

import { Logger } from "../../core/logging";
import { PuzzleSerializer } from "../../savegame/puzzle_serializer";
import { T } from "../../translations";
import { BUILDING_IDS } from "../building_identifiers";
import { enumGameModeIds } from "../game_mode";
import { HUDPuzzleNextPuzzle } from "../hud/parts/next_puzzle";
import { HUDPuzzleCompleteNotification } from "../hud/parts/puzzle_complete_notification";
import { HUDPuzzlePlayMetadata } from "../hud/parts/puzzle_play_metadata";
import { HUDPuzzlePlaySettings } from "../hud/parts/puzzle_play_settings";
import { PuzzleGameMode } from "./puzzle";

const logger = new Logger("puzzle-play");

export class PuzzlePlayGameMode extends PuzzleGameMode {
    static getId() {
        return enumGameModeIds.puzzlePlay;
    }

    /**
     * @param {GameRoot} root
     * @param {object} payload
     * @param {import("../../savegame/savegame_typedefs").PuzzleFullData} payload.puzzle
     * @param {Array<number> | undefined} payload.nextPuzzles
     */
    constructor(root, { puzzle, nextPuzzles }) {
        super(root);

        /** @type {string[]} */
        let excludedBuildings = [
            BUILDING_IDS.constantProducer,
            BUILDING_IDS.goalAcceptor,
            BUILDING_IDS.block,

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

        if (puzzle.game.excludedBuildings) {
            excludedBuildings.push(...puzzle.game.excludedBuildings);
        }

        this.hiddenBuildings = excludedBuildings;

        this.additionalHudParts.puzzlePlayMetadata = HUDPuzzlePlayMetadata;
        this.additionalHudParts.puzzlePlaySettings = HUDPuzzlePlaySettings;
        this.additionalHudParts.puzzleCompleteNotification = HUDPuzzleCompleteNotification;

        root.signals.postLoadHook.add(this.loadPuzzle, this);

        this.puzzle = puzzle;

        /**
         * @type {Array<number>}
         */
        this.nextPuzzles = nextPuzzles || [];

        if (this.nextPuzzles.length > 0) {
            this.additionalHudParts.puzzleNext = HUDPuzzleNextPuzzle;
        }
    }

    loadPuzzle() {
        let errorText;
        logger.log("Loading puzzle", this.puzzle);

        try {
            this.zoneWidth = this.puzzle.game.bounds.w;
            this.zoneHeight = this.puzzle.game.bounds.h;
            errorText = new PuzzleSerializer().deserializePuzzle(this.root, this.puzzle.game);
        } catch (ex) {
            errorText = ex.message || ex;
        }

        if (errorText) {
            this.root.gameState.moveToState("PuzzleMenuState", {
                error: {
                    title: T.dialogs.puzzleLoadError.title,
                    desc: T.dialogs.puzzleLoadError.desc + " " + errorText,
                },
            });
            // const signals = this.root.hud.parts.dialogs.showWarning(
            //     T.dialogs.puzzleLoadError.title,
            //     T.dialogs.puzzleLoadError.desc + " " + errorText
            // );
            // signals.ok.add(() => this.root.gameState.moveToState("PuzzleMenuState"));
        }
    }

    /**
     *
     * @param {boolean} liked
     * @param {number} time
     */
    trackCompleted(liked, time) {
        const closeLoading = this.root.hud.parts.dialogs.showLoadingDialog();

        return this.root.app.clientApi
            .apiCompletePuzzle(this.puzzle.meta.id, {
                time,
                liked,
            })
            .catch(err => {
                logger.warn("Failed to complete puzzle:", err);
            })
            .then(() => {
                closeLoading();
            });
    }

    sharePuzzle() {
        navigator.clipboard.writeText(this.puzzle.meta.shortKey);

        this.root.hud.parts.dialogs.showInfo(
            T.dialogs.puzzleShare.title,
            T.dialogs.puzzleShare.desc.replace("<key>", this.puzzle.meta.shortKey)
        );
    }

    reportPuzzle() {
        const { optionSelected } = this.root.hud.parts.dialogs.showOptionChooser(
            T.dialogs.puzzleReport.title,
            {
                options: [
                    { value: "profane", text: T.dialogs.puzzleReport.options.profane },
                    { value: "unsolvable", text: T.dialogs.puzzleReport.options.unsolvable },
                    { value: "trolling", text: T.dialogs.puzzleReport.options.trolling },
                ],
            }
        );

        return new /** @type {typeof Promise<void>} */ (Promise)(resolve => {
            optionSelected.add(option => {
                const closeLoading = this.root.hud.parts.dialogs.showLoadingDialog();

                this.root.app.clientApi.apiReportPuzzle(this.puzzle.meta.id, option).then(
                    () => {
                        closeLoading();
                        const { ok } = this.root.hud.parts.dialogs.showInfo(
                            T.dialogs.puzzleReportComplete.title,
                            T.dialogs.puzzleReportComplete.desc
                        );
                        ok.add(resolve);
                    },
                    err => {
                        closeLoading();
                        const { ok } = this.root.hud.parts.dialogs.showInfo(
                            T.dialogs.puzzleReportError.title,
                            T.dialogs.puzzleReportError.desc + " " + err
                        );
                    }
                );
            });
        });
    }
}
