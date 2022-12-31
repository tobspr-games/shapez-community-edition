/* typehints:start */
import type { Application } from "../application";
import type { StateManager } from "./state_manager";
/* typehints:end */

import { globalConfig } from "./config";
import { ClickDetector } from "./click_detector";
import { logSection, createLogger } from "./logging";
import { InputReceiver } from "./input_receiver";
import { waitNextFrame } from "./utils";
import { RequestChannel } from "./request_channel";
import { MUSIC } from "../platform/sound";

const logger = createLogger("game_state");

/** Basic state of the game state machine. This is the base of the whole game */
export class GameState {
    public key = key;

    public stateManager: StateManager = null;

    public app: Application = null;

    //// Store if we are currently fading out
    public fadingOut = false;

    public clickDetectors: Array<ClickDetector> = [];

    //// Every state captures keyboard events by default
    public inputReciever = new InputReceiver("state-" + key);

    //// A channel we can use to perform async ops
    public asyncChannel = new RequestChannel();
    /**
     * Constructs a new state with the given id
     * @param key The id of the state. We use ids to refer to states because otherwise we get
     * circular references
     */

    constructor(key) {
        this.inputReciever.backButton.add(this.onBackButton, this);
    }

    //// GETTERS / HELPER METHODS ////

    /** Returns the states key */
    getKey(): string {
        return this.key;
    }

    /** Returns the html element of the state */
    getDivElement(): HTMLElement {
        return document.getElementById("state_" + this.key);
    }

    /**
     * Transfers to a new state
     * @param stateKey The id of the new state
     */
    moveToState(stateKey: string, payload = {}, skipFadeOut = false) {
        if (this.fadingOut) {
            logger.warn("Skipping move to '" + stateKey + "' since already fading out");
            return;
        }

        // Clean up event listeners
        this.internalCleanUpClickDetectors();

        // Fading
        const fadeTime = this.internalGetFadeInOutTime();
        const doFade = !skipFadeOut && this.getHasFadeOut() && fadeTime !== 0;
        logger.log("Moving to", stateKey, "(fading=", doFade, ")");
        if (doFade) {
            this.htmlElement.classList.remove("arrived");
            this.fadingOut = true;
            setTimeout(() => {
                this.stateManager.moveToState(stateKey, payload);
            }, fadeTime);
        } else {
            this.stateManager.moveToState(stateKey, payload);
        }
    }

    /**
     * Tracks clicks on a given element and calls the given callback *on this state*.
     * If you want to call another function wrap it inside a lambda.
     * @param element The element to track clicks on
     * @param handler The handler to call
     * @param args Click detector arguments
     */
    trackClicks(
        element: Element,
        handler: () => void,
        args: import("./click_detector").ClickDetectorConstructorArgs = {}
    ) {
        const detector = new ClickDetector(element, args);
        detector.click.add(handler, this);
        if (G_IS_DEV) {
            // Append a source so we can check where the click detector is from
            // @ts-ignore
            detector._src = "state-" + this.key;
        }
        this.clickDetectors.push(detector);
    }

    /** Cancels all promises on the api as well as our async channel */
    cancelAllAsyncOperations() {
        this.asyncChannel.cancelAll();
    }

    //// CALLBACKS ////

    /**
     * Callback when entering the state, to be overriddemn
     * @param payload Arbitrary data passed from the state which we are transferring from
     */
    onEnter(payload: any) {}

    /** Callback when leaving the state */
    onLeave() {}

    /** Callback when the app got paused (on android, this means in background) */
    onAppPause() {}

    /** Callback when the app got resumed (on android, this means in foreground again) */
    onAppResume() {}

    /**
     * Render callback
     * @param dt Delta time in ms since last render
     */
    onRender(dt: number) {}

    /**
     * Background tick callback, called while the game is inactiev
     * @param dt Delta time in ms since last tick
     */
    onBackgroundTick(dt: number) {}

    /**
     * Called when the screen resized
     * @param w window/screen width
     * @param h window/screen height
     */
    onResized(w: number, h: number) {}

    /**
     * Internal backbutton handler, called when the hardware back button is pressed or
     * the escape key is pressed
     */
    onBackButton() {}

    //// INTERFACE ////

    /**
     * Should return how many mulliseconds to fade in / out the state. Not recommended to override!
     * @returns Time in milliseconds to fade out
     */
    getInOutFadeTime(): number {
        if (globalConfig.debug.noArtificialDelays) {
            return 0;
        }
        return 200;
    }

    /**
     * Should return whether to fade in the game state. This will then apply the right css classes
     * for the fadein.
     */
    getHasFadeIn(): boolean {
        return true;
    }

    /**
     * Should return whether to fade out the game state. This will then apply the right css classes
     * for the fadeout and wait the delay before moving states
     */
    getHasFadeOut(): boolean {
        return true;
    }

    /**
     * Returns if this state should get paused if it does not have focus
     * @returns true to pause the updating of the game
     */
    getPauseOnFocusLost(): boolean {
        return true;
    }

    /**
     * Should return the html code of the state.
     * @abstract
     */
    getInnerHTML(): string {
        abstract;
        return "";
    }

    /**
     * Returns if the state has an unload confirmation, this is the
     * "Are you sure you want to leave the page" message.
     */
    getHasUnloadConfirmation() {
        return false;
    }

    /** Should return the theme music for this state */
    getThemeMusic(): string | null {
        return MUSIC.menu;
    }

    /** Should return true if the player is currently ingame */
    getIsIngame(): boolean {
        return false;
    }

    /** Should return whether to clear the whole body content before entering the state. */
    getRemovePreviousContent(): boolean {
        return true;
    }

    ////////////////////

    //// INTERNAL ////

    /** Internal callback from the manager. Do not override! */
    internalRegisterCallback(stateManager: StateManager, app) {
        assert(stateManager, "No state manager");
        assert(app, "No app");
        this.stateManager = stateManager;
        this.app = app;
    }

    /**
     * Internal callback when entering the state. Do not override!
     * @param payload Arbitrary data passed from the state which we are transferring from
     * @param callCallback Whether to call the onEnter callback
     */
    internalEnterCallback(payload: any, callCallback: boolean = true) {
        logSection(this.key, "#26a69a");
        this.app.inputMgr.pushReciever(this.inputReciever);

        this.htmlElement = this.getDivElement();
        this.htmlElement.classList.add("active");

        // Apply classes in the next frame so the css transition keeps up
        waitNextFrame().then(() => {
            if (this.htmlElement) {
                this.htmlElement.classList.remove("fadingOut");
                this.htmlElement.classList.remove("fadingIn");
            }
        });

        // Call handler
        if (callCallback) {
            this.onEnter(payload);
        }
    }

    /** Internal callback when the state is left. Do not override! */
    internalLeaveCallback() {
        this.onLeave();

        this.htmlElement.classList.remove("active");
        this.app.inputMgr.popReciever(this.inputReciever);
        this.internalCleanUpClickDetectors();
        this.asyncChannel.cancelAll();
    }

    /** Internal app pause callback */
    internalOnAppPauseCallback() {
        this.onAppPause();
    }

    /** Internal app resume callback */
    internalOnAppResumeCallback() {
        this.onAppResume();
    }

    /** Cleans up all click detectors */
    internalCleanUpClickDetectors() {
        if (this.clickDetectors) {
            for (let i = 0; i < this.clickDetectors.length; ++i) {
                this.clickDetectors[i].cleanup();
            }
            this.clickDetectors = [];
        }
    }

    /** Internal method to get the HTML of the game state. */
    internalGetFullHtml(): string {
        return this.getInnerHTML();
    }

    /**
     * Internal method to compute the time to fade in / out
     * @returns time to fade in / out in ms
     */
    internalGetFadeInOutTime(): number {
        if (G_IS_DEV && globalConfig.debug.fastGameEnter) {
            return 1;
        }
        if (G_IS_DEV && globalConfig.debug.noArtificialDelays) {
            return 1;
        }
        return this.getInOutFadeTime();
    }
}
