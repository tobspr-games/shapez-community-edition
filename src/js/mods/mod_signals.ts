import type { LevelDefinition } from "@/game/modes/regular";
import type { SerializedGame } from "@/savegame/savegame_typedefs";
import type { GameState } from "../core/game_state";
import { Signal } from "../core/signal";
import type { BaseHUDPart } from "../game/hud/base_hud_part";
import type { GameRoot } from "../game/root";
import type { InGameState } from "../states/ingame";

// Single file to avoid circular deps

export const MOD_SIGNALS = {
    // Called when the application has booted and instances like the app settings etc are available
    appBooted: new Signal<[]>(),

    modifyLevelDefinitions: new Signal<[levelDefinitions: LevelDefinition[]]>(),
    modifyUpgrades: new Signal<[upgrades: object]>(),

    hudElementInitialized: new Signal<[hudElement: BaseHUDPart]>(),
    hudElementFinalized: new Signal<[hudElement: BaseHUDPart]>(),

    hudInitializer: new Signal<[root: GameRoot]>(),

    gameInitialized: new Signal<[root: GameRoot]>(),
    gameLoadingStageEntered: new Signal<[inGameState: InGameState, stageId: string]>(),

    gameStarted: new Signal<[root: GameRoot]>(),

    stateEntered: new Signal<[state: GameState]>(),

    gameSerialized: new Signal<[root: GameRoot, dump: SerializedGame]>(),
    gameDeserialized: new Signal<[root: GameRoot, dump: SerializedGame]>(),
};
