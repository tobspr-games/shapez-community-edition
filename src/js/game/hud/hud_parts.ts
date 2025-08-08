import type { HUDBetaOverlay } from "./parts/beta_overlay.js";
import type { HUDBlueprintPlacer } from "./parts/blueprint_placer.js";
import type { HUDBuildingsToolbar } from "./parts/buildings_toolbar.js";
import type { HUDBuildingPlacer } from "./parts/building_placer.js";
import type { HUDColorBlindHelper } from "./parts/color_blind_helper.js";
import type { HUDConstantSignalEdit } from "./parts/constant_signal_edit.js";
import type { HUDChangesDebugger } from "./parts/debug_changes.js";
import type { HUDDebugInfo } from "./parts/debug_info.js";
import type { HUDEntityDebugger } from "./parts/entity_debugger.js";
import type { HUDGameMenu } from "./parts/game_menu.js";
import type { HUDInteractiveTutorial } from "./parts/interactive_tutorial.js";
import type { HUDKeybindingOverlay } from "./parts/keybinding_overlay.js";
import type { HUDLayerPreview } from "./parts/layer_preview.js";
import type { HUDLeverToggle } from "./parts/lever_toggle.js";
import type { HUDMassSelector } from "./parts/mass_selector.js";
import type { HUDMinerHighlight } from "./parts/miner_highlight.js";
import type { HUDModalDialogs } from "./parts/modal_dialogs.js";
import type { HUDPuzzleNextPuzzle } from "./parts/next_puzzle.js";
import type { HUDNotifications } from "./parts/notifications.js";
import type { HUDPinnedShapes } from "./parts/pinned_shapes.js";
import type { HUDPuzzleBackToMenu } from "./parts/puzzle_back_to_menu.js";
import type { HUDPuzzleCompleteNotification } from "./parts/puzzle_complete_notification.js";
import type { HUDPuzzleDLCLogo } from "./parts/puzzle_dlc_logo.js";
import type { HUDPuzzleEditorControls } from "./parts/puzzle_editor_controls.js";
import type { HUDPuzzleEditorReview } from "./parts/puzzle_editor_review.js";
import type { HUDPuzzleEditorSettings } from "./parts/puzzle_editor_settings.js";
import type { HUDPuzzlePlayMetadata } from "./parts/puzzle_play_metadata.js";
import type { HUDPuzzlePlaySettings } from "./parts/puzzle_play_settings.js";
import type { HUDScreenshotExporter } from "./parts/screenshot_exporter.js";
import type { HUDSettingsMenu } from "./parts/settings_menu.js";
import type { HUDShapeTooltip } from "./parts/shape_tooltip.js";
import type { HUDShapeViewer } from "./parts/shape_viewer.js";
import type { HUDShop } from "./parts/shop.js";
import type { HUDStatistics } from "./parts/statistics.js";
import type { HUDPartTutorialHints } from "./parts/tutorial_hints.js";
import type { HUDTutorialVideoOffer } from "./parts/tutorial_video_offer.js";
import type { HUDUnlockNotification } from "./parts/unlock_notification.js";
import type { HUDVignetteOverlay } from "./parts/vignette_overlay.js";
import type { HUDWaypoints } from "./parts/waypoints.js";
import type { HUDWiresOverlay } from "./parts/wires_overlay.js";
import type { HUDWiresToolbar } from "./parts/wires_toolbar.js";
import type { HUDWireInfo } from "./parts/wire_info.js";

export interface HudParts {
    buildingsToolbar: HUDBuildingsToolbar;

    blueprintPlacer: HUDBlueprintPlacer;
    buildingPlacer: HUDBuildingPlacer;

    shapeTooltip: HUDShapeTooltip;

    // Must always exist
    settingsMenu: HUDSettingsMenu;
    debugInfo: HUDDebugInfo;
    dialogs: HUDModalDialogs;

    // Dev
    entityDebugger?: HUDEntityDebugger;
    changesDebugger?: HUDChangesDebugger;

    vignetteOverlay?: HUDVignetteOverlay;
    colorBlindHelper?: HUDColorBlindHelper;
    betaOverlay?: HUDBetaOverlay;

    // Additional Hud Parts
    // Shared
    massSelector?: HUDMassSelector;
    constantSignalEdit?: HUDConstantSignalEdit;

    // Regular
    wiresToolbar?: HUDWiresToolbar;
    unlockNotification?: HUDUnlockNotification;
    shop?: HUDShop;
    statistics?: HUDStatistics;
    waypoints?: HUDWaypoints;
    wireInfo?: HUDWireInfo;
    leverToggle?: HUDLeverToggle;
    pinnedShapes?: HUDPinnedShapes;
    notifications?: HUDNotifications;
    screenshotExporter?: HUDScreenshotExporter;
    wiresOverlay?: HUDWiresOverlay;
    shapeViewer?: HUDShapeViewer;
    layerPreview?: HUDLayerPreview;
    minerHighlight?: HUDMinerHighlight;
    tutorialVideoOffer?: HUDTutorialVideoOffer;
    gameMenu?: HUDGameMenu;
    keybindingOverlay?: HUDKeybindingOverlay;
    tutorialHints?: HUDPartTutorialHints;
    interactiveTutorial?: HUDInteractiveTutorial;

    // Puzzle mode
    puzzleBackToMenu?: HUDPuzzleBackToMenu;
    puzzleDlcLogo?: HUDPuzzleDLCLogo;

    puzzleEditorControls?: HUDPuzzleEditorControls;
    puzzleEditorReview?: HUDPuzzleEditorReview;
    puzzleEditorSettings?: HUDPuzzleEditorSettings;

    puzzlePlayMetadata?: HUDPuzzlePlayMetadata;
    puzzlePlaySettings?: HUDPuzzlePlaySettings;
    puzzleCompleteNotification?: HUDPuzzleCompleteNotification;
    puzzleNext?: HUDPuzzleNextPuzzle;
}
