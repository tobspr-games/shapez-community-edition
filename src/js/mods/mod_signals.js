/* typehints:start */
import { BaseHUDPart } from "../game/hud/base_hud_part";
import { GameRoot } from "../game/root";
import { GameState } from "../core/game_state";
import { InGameState } from "../states/ingame";
/* typehints:end */

import { Signal } from "../core/signal";

// Single file to avoid circular deps

export const MOD_SIGNALS = {
    // Called when the application has booted and instances like the app settings etc are available
    appBooted: new Signal(),

    modifyLevelDefinitions: /** @type {Signal<[Array[Object]]>} */ (new Signal()),
    modifyUpgrades: /** @type {Signal<[Object]>} */ (new Signal()),

    hudElementInitialized: /** @type {Signal<[BaseHUDPart]>} */ (new Signal()),
    hudElementFinalized: /** @type {Signal<[BaseHUDPart]>} */ (new Signal()),

    hudInitializer: /** @type {Signal<[GameRoot]>} */ (new Signal()),

    gameInitialized: /** @type {Signal<[GameRoot]>} */ (new Signal()),
    gameLoadingStageEntered: /** @type {Signal<[InGameState, string]>} */ (new Signal()),

    gameStarted: /** @type {Signal<[GameRoot]>} */ (new Signal()),

    stateEntered: /** @type {Signal<[GameState]>} */ (new Signal()),

    gameSerialized:
        /** @type {Signal<[GameRoot, import("../savegame/savegame_typedefs").SerializedGame]>} */ (
            new Signal()
        ),
    gameDeserialized:
        /** @type {Signal<[GameRoot, import("../savegame/savegame_typedefs").SerializedGame]>} */ (
            new Signal()
        ),
};
