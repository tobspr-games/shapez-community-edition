import { AnimationFrame } from "./core/animation_frame";
import { BackgroundResourcesLoader } from "./core/background_resources_loader";
import { GameState } from "./core/game_state";
import { setGlobalApp } from "./core/globals";
import { InputDistributor } from "./core/input_distributor";
import { Loader } from "./core/loader";
import { createLogger } from "./core/logging";
import { StateManager } from "./core/state_manager";
import { TrackedState } from "./core/tracked_state";
import { getPlatformName, waitNextFrame } from "./core/utils";
import { Vector } from "./core/vector";
import { MOD_SIGNALS } from "./mods/mod_signals";
import { MODS } from "./mods/modloader";
import { ClientAPI } from "./platform/api";
import { Sound } from "./platform/sound";
import { Storage, STORAGE_SAVES } from "./platform/storage";
import { PlatformWrapperImplElectron } from "./platform/wrapper";
import { ApplicationSettings } from "./profile/application_settings";
import { SavegameManager } from "./savegame/savegame_manager";
import { AboutState } from "./states/about";
import { ChangelogState } from "./states/changelog";
import { InGameState } from "./states/ingame";
import { KeybindingsState } from "./states/keybindings";
import { LoginState } from "./states/login";
import { MainMenuState } from "./states/main_menu";
import { ModsState } from "./states/mods";
import { PreloadState } from "./states/preload";
import { PuzzleMenuState } from "./states/puzzle_menu";
import { SettingsState } from "./states/settings";

/**
 * @typedef {import("./platform/sound").SoundInterface} SoundInterface
 */

const logger = createLogger("application");

export class Application {
    /**
     * Boots the application
     */
    async boot() {
        console.log("Booting ...");

        logger.log("Creating application, platform =", getPlatformName());
        setGlobalApp(this);

        // MODS

        try {
            await MODS.initMods();
        } catch (ex) {
            alert("Failed to load mods (launch with --dev for more info): \n\n" + ex);
        }

        this.unloaded = false;

        // Platform stuff
        this.storage = new Storage(this, STORAGE_SAVES);
        await this.storage.initialize();

        this.platformWrapper = new PlatformWrapperImplElectron(this);

        // Global stuff
        this.settings = new ApplicationSettings(this, this.storage);
        this.ticker = new AnimationFrame();
        this.stateMgr = new StateManager(this);
        // NOTE: SavegameManager uses the passed storage, but savegames always
        // use Application#storage
        this.savegameMgr = new SavegameManager(this, this.storage);
        this.inputMgr = new InputDistributor(this);
        this.backgroundResourceLoader = new BackgroundResourcesLoader(this);
        this.clientApi = new ClientAPI(this);

        this.sound = new Sound(this);

        // Track if the window is focused (only relevant for browser)
        this.focused = true;

        // Track if the window is visible
        this.pageVisible = true;

        // Track if the app is paused (cordova)
        this.applicationPaused = false;

        /** @type {TypedTrackedState<boolean>} */
        this.trackedIsRenderable = new TrackedState(this.onAppRenderableStateChanged, this);

        /** @type {TypedTrackedState<boolean>} */
        this.trackedIsPlaying = new TrackedState(this.onAppPlayingStateChanged, this);

        // Dimensions
        this.screenWidth = 0;
        this.screenHeight = 0;

        // Store the timestamp where we last checked for a screen resize, since orientationchange is unreliable with cordova
        this.lastResizeCheck = null;

        // Store the mouse position, or null if not available
        /** @type {Vector|null} */
        this.mousePosition = null;

        this.registerStates();
        this.registerEventListeners();

        Loader.linkAppAfterBoot(this);

        this.stateMgr.moveToState("PreloadState");

        // Starting rendering
        this.ticker.frameEmitted.add(this.onFrameEmitted, this);
        this.ticker.bgFrameEmitted.add(this.onBackgroundFrame, this);
        this.ticker.start();

        window.focus();

        MOD_SIGNALS.appBooted.dispatch();
    }

    /**
     * Registers all game states
     */
    registerStates() {
        /** @type {Array<typeof GameState>} */
        const states = [
            PreloadState,
            MainMenuState,
            InGameState,
            SettingsState,
            KeybindingsState,
            AboutState,
            ChangelogState,
            PuzzleMenuState,
            LoginState,
            ModsState,
        ];

        for (let i = 0; i < states.length; ++i) {
            this.stateMgr.register(states[i]);
        }
    }

    /**
     * Registers all event listeners
     */
    registerEventListeners() {
        window.addEventListener("focus", this.onFocus.bind(this));
        window.addEventListener("blur", this.onBlur.bind(this));

        window.addEventListener("resize", () => this.checkResize(), true);
        window.addEventListener("orientationchange", () => this.checkResize(), true);

        window.addEventListener("mousemove", this.handleMousemove.bind(this));
        window.addEventListener("mouseout", this.handleMousemove.bind(this));
        window.addEventListener("mouseover", this.handleMousemove.bind(this));
        window.addEventListener("mouseleave", this.handleMousemove.bind(this));

        // Unload events
        window.addEventListener("beforeunload", this.onBeforeUnload.bind(this), true);

        document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this), false);

        // Track touches so we can update the focus appropriately
        document.addEventListener("touchstart", this.updateFocusAfterUserInteraction.bind(this), true);
        document.addEventListener("touchend", this.updateFocusAfterUserInteraction.bind(this), true);
    }

    /**
     * Checks the focus after a touch
     * @param {TouchEvent} event
     */
    updateFocusAfterUserInteraction(event) {
        const target = /** @type {HTMLElement} */ (event.target);
        if (!target || !target.tagName) {
            // Safety check
            logger.warn("Invalid touchstart/touchend event:", event);
            return;
        }

        // When clicking an element which is not the currently focused one, defocus it
        if (target !== document.activeElement) {
            // @ts-ignore
            if (document.activeElement.blur) {
                // @ts-ignore
                document.activeElement.blur();
            }
        }

        // If we click an input field, focus it now
        if (target.tagName.toLowerCase() === "input") {
            // We *really* need the focus
            waitNextFrame().then(() => target.focus());
        }
    }

    /**
     * Handles a page visibility change event
     * @param {Event} event
     */
    handleVisibilityChange(event) {
        window.focus();
        const pageVisible = !document.hidden;
        if (pageVisible !== this.pageVisible) {
            this.pageVisible = pageVisible;
            logger.log("Visibility changed:", this.pageVisible);
            this.trackedIsRenderable.set(this.isRenderable());
        }
    }

    /**
     * Handles a mouse move event
     * @param {MouseEvent} event
     */
    handleMousemove(event) {
        this.mousePosition = new Vector(event.clientX, event.clientY);
    }

    /**
     * Internal on focus handler
     */
    onFocus() {
        this.focused = true;
    }

    /**
     * Internal blur handler
     */
    onBlur() {
        this.focused = false;
    }

    /**
     * Returns if the app is currently visible
     */
    isRenderable() {
        return !this.applicationPaused && this.pageVisible;
    }

    onAppRenderableStateChanged(renderable) {
        logger.log("Application renderable:", renderable);
        window.focus();
        const currentState = this.stateMgr.getCurrentState();
        if (!renderable) {
            if (currentState) {
                currentState.onAppPause();
            }
        } else {
            if (currentState) {
                currentState.onAppResume();
            }
            this.checkResize();
        }

        this.sound.onPageRenderableStateChanged(renderable);
    }

    onAppPlayingStateChanged(playing) {
        // TODO: Check for usages and alternatives. This can be turned into a singal.
    }

    /**
     * Internal before-unload handler
     */
    onBeforeUnload(event) {}

    /**
     * Deinitializes the application
     */
    deinitialize() {
        return this.sound.deinitialize();
    }

    /**
     * Background frame update callback
     * @param {number} dt
     */
    onBackgroundFrame(dt) {
        if (this.isRenderable()) {
            return;
        }

        const currentState = this.stateMgr.getCurrentState();
        if (currentState) {
            currentState.onBackgroundTick(dt);
        }
    }

    /**
     * Frame update callback
     * @param {number} dt
     */
    onFrameEmitted(dt) {
        if (!this.isRenderable()) {
            return;
        }

        const time = performance.now();

        // Periodically check for resizes, this is expensive (takes 2-3ms so only do it once in a while!)
        if (!this.lastResizeCheck || time - this.lastResizeCheck > 1000) {
            this.checkResize();
            this.lastResizeCheck = time;
        }

        const currentState = this.stateMgr.getCurrentState();
        this.trackedIsPlaying.set(currentState && currentState.getIsIngame());
        if (currentState) {
            currentState.onRender(dt);
        }
    }

    /**
     * Checks if the app resized. Only does this once in a while
     * @param {boolean} forceUpdate Forced update of the dimensions
     */
    checkResize(forceUpdate = false) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (this.screenWidth !== w || this.screenHeight !== h || forceUpdate) {
            this.screenWidth = w;
            this.screenHeight = h;
            const currentState = this.stateMgr.getCurrentState();
            if (currentState) {
                currentState.onResized(this.screenWidth, this.screenHeight);
            }

            const scale = this.getEffectiveUiScale();
            waitNextFrame().then(() => document.documentElement.style.setProperty("--ui-scale", `${scale}`));
            window.focus();
        }
    }

    /**
     * Returns the effective ui sclae
     */
    getEffectiveUiScale() {
        return this.platformWrapper.getUiScale() * this.settings.getInterfaceScaleValue();
    }

    /**
     * Callback after ui scale has changed
     */
    updateAfterUiScaleChanged() {
        this.checkResize(true);
    }
}
