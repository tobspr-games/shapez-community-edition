import { MUSIC } from "@/platform/sound";
import type { Application } from "../application";
import { ClickDetector } from "./click_detector";
import { globalConfig } from "./config";
import { InputReceiver } from "./input_receiver";
import { createLogger, logSection } from "./logging";
import { RequestChannel } from "./request_channel";
import type { StateManager } from "./state_manager";
import { waitNextFrame } from "./utils";

const logger = createLogger("game_state");

/**
 * Basic state of the game state machine. This is the base of the whole game
 */
export class GameState {
    public app: Application = null;
    public readonly key: string;
    public inputReceiver: InputReceiver;

    /** A channel we can use to perform async ops */
    protected asyncChannel = new RequestChannel();
    protected clickDetectors: ClickDetector[] = [];

    /** @todo review this */
    protected htmlElement: HTMLElement | undefined;

    private stateManager: StateManager = null;

    /** Store if we are currently fading out */
    private fadingOut = false;

    /**
     * Constructs a new state with the given id
     * @param key The id of the state. We use ids to refer to states because otherwise we get
     *            circular references
     */
    constructor(key: string) {
        this.key = key;

        // Every state captures keyboard events by default
        this.inputReceiver = new InputReceiver("state-" + key);
        this.inputReceiver.backButton.add(this.onBackButton, this);
    }

    //// GETTERS / HELPER METHODS ////

    /**
     * Returns the html element of the state
     */
    getDivElement(): HTMLElement {
        return document.getElementById("state_" + this.key);
    }

    /**
     * Transfers to a new state
     * @param {string} stateKey The id of the new state
     */
    moveToState(stateKey, payload = {}, skipFadeOut = false) {
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
     * @param {Element} element The element to track clicks on
     * @param {function():void} handler The handler to call
     * @param {import("./click_detector").ClickDetectorConstructorArgs=} args Click detector arguments
     */
    trackClicks(element, handler, args = {}) {
        const detector = new ClickDetector(element, args);
        detector.click.add(handler, this);
        if (G_IS_DEV) {
            // Append a source so we can check where the click detector is from
            // @ts-ignore
            detector._src = "state-" + this.key;
        }
        this.clickDetectors.push(detector);
    }

    /**
     * Cancels all promises on the api as well as our async channel
     */
    cancelAllAsyncOperations() {
        this.asyncChannel.cancelAll();
    }

    //// CALLBACKS ////

    /**
     * Callback when entering the state, to be overriddemn
     * @param payload Arbitrary data passed from the state which we are transferring from
     */
    onEnter(payload: {}) {}

    /**
     * Callback when leaving the state
     */
    onLeave() {}

    /**
     * Callback when the app got paused (on android, this means in background)
     */
    onAppPause() {}

    /**
     * Callback when the app got resumed (on android, this means in foreground again)
     */
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
     * @deprecated use {@link getContentLayout} instead
     */
    getInnerHTML(): string {
        return "";
    }

    /**
     * Should return the element(s) to be displayed in the state.
     * If null, {@link getInnerHTML} will be used instead.
     */
    protected getContentLayout(): Node {
        return null;
    }

    /**
     * Returns if the state has an unload confirmation, this is the
     * "Are you sure you want to leave the page" message.
     */
    getHasUnloadConfirmation() {
        return false;
    }

    /**
     * Should return the theme music for this state
     */
    getThemeMusic(): string | null {
        return MUSIC.menu;
    }

    /**
     * Should return true if the player is currently ingame
     */
    getIsIngame(): boolean {
        return false;
    }

    /**
     * Should return whether to clear the whole body content before entering the state.
     */
    getRemovePreviousContent(): boolean {
        return true;
    }

    ////////////////////

    //// INTERNAL ////

    /**
     * Internal callback from the manager. Do not override!
     */
    internalRegisterCallback(stateManager: StateManager, app: Application) {
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
    internalEnterCallback(payload: any, callCallback = true) {
        logSection(this.key, "#26a69a");
        this.app.inputMgr.pushReceiver(this.inputReceiver);

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

    /**
     * Internal callback when the state is left. Do not override!
     */
    internalLeaveCallback() {
        this.onLeave();

        this.htmlElement.classList.remove("active");
        this.app.inputMgr.popReceiver(this.inputReceiver);
        this.internalCleanUpClickDetectors();
        this.asyncChannel.cancelAll();
    }

    /**
     * Internal app pause callback
     */
    internalOnAppPauseCallback() {
        this.onAppPause();
    }

    /**
     * Internal app resume callback
     */
    internalOnAppResumeCallback() {
        this.onAppResume();
    }

    /**
     * Cleans up all click detectors
     */
    internalCleanUpClickDetectors() {
        if (this.clickDetectors) {
            for (let i = 0; i < this.clickDetectors.length; ++i) {
                this.clickDetectors[i].cleanup();
            }
            this.clickDetectors = [];
        }
    }

    /**
     * Internal method to get all elements of the game state. Can be
     * called from subclasses to provide support for both HTMLElements
     * and HTML strings.
     */
    internalGetWrappedContent(): Node {
        const elements = this.getContentLayout();
        if (elements instanceof Node) {
            return elements;
        }

        if (Array.isArray(elements)) {
            const fragment = document.createDocumentFragment();
            fragment.append(...(elements as Node[]));
            return fragment;
        }

        // Fall back to deprecated HTML strings solution
        const template = document.createElement("template");
        template.innerHTML = this.getInnerHTML();
        return template.content;
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
