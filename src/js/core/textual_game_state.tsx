import { HUDModalDialogs } from "../game/hud/parts/modal_dialogs";
import { GameState } from "./game_state";

/**
 * Baseclass for all game states which are structured similary: A header with back button + some
 * scrollable content.
 */
export abstract class TextualGameState extends GameState {
    private backToStateId: string | null = null;
    private backToStatePayload: {} | null = null;

    protected headerElement: HTMLElement;
    protected containerElement: HTMLElement;
    protected dialogs: HUDModalDialogs;

    /**
     * Should return the states inner html. If not overriden, will create a scrollable container
     * with the content of getMainContentHTML()
     * @deprecated
     */
    getInnerHTML(): string {
        return "";
    }

    /**
     * Should return the states HTML content.
     * @deprecated
     */
    getMainContentHTML(): string {
        return "";
    }

    protected override getContentLayout(): Node {
        let content = this.getInitialContent();

        if (content === null) {
            // Fall back either to getMainContentHTML or getInnerHTML (if not "")
            let html = this.getInnerHTML();
            if (html === "") {
                html = `
                    <div class="content mainContent">
                        ${this.getMainContentHTML()}
                    </div>
                `;
            }

            const template = document.createElement("template");
            template.innerHTML = html;
            content = template.content;
        }

        return (
            <>
                <div class="headerBar">
                    <h1>
                        <button class="backButton"></button>
                        {this.getStateHeaderTitle() ?? ""}
                    </h1>
                </div>
                <div class="container">{content}</div>
            </>
        );
    }

    protected getInitialContent(): Node {
        return null;
    }

    /**
     * Should return the title of the game state. If null, no title and back button will
     * get created
     */
    protected getStateHeaderTitle(): string | null {
        return null;
    }

    /////////////

    /**
     * Back button handler, can be overridden. Per default it goes back to the main menu,
     * or if coming from the game it moves back to the game again.
     */
    override onBackButton() {
        if (this.backToStateId) {
            this.moveToState(this.backToStateId, this.backToStatePayload);
        } else {
            this.moveToState(this.getDefaultPreviousState());
        }
    }

    /**
     * Returns the default state to go back to
     */
    getDefaultPreviousState() {
        return "MainMenuState";
    }

    /**
     * Goes to a new state, telling him to go back to this state later
     * @param stateId
     */
    moveToStateAddGoBack(stateId: string) {
        this.moveToState(stateId, {
            backToStateId: this.key,
            backToStatePayload: {
                backToStateId: this.backToStateId,
                backToStatePayload: this.backToStatePayload,
            },
        });
    }

    /**
     * Removes all click detectors, except the one on the back button. Useful when regenerating
     * content.
     */
    clearClickDetectorsExceptHeader() {
        for (let i = 0; i < this.clickDetectors.length; ++i) {
            const detector = this.clickDetectors[i];
            if (detector.element === this.headerElement) {
                continue;
            }
            detector.cleanup();
            this.clickDetectors.splice(i, 1);
            i -= 1;
        }
    }

    //// INTERNALS /////

    /**
     * Overrides the GameState leave callback to cleanup stuff
     */
    override internalLeaveCallback() {
        super.internalLeaveCallback();
        this.dialogs.cleanup();
    }

    /**
     * Overrides the GameState enter callback to setup required stuff
     */
    override internalEnterCallback(payload: any) {
        super.internalEnterCallback(payload, false);
        if (payload.backToStateId) {
            this.backToStateId = payload.backToStateId;
            this.backToStatePayload = payload.backToStatePayload;
        }

        this.htmlElement.classList.add("textualState");
        if (this.getStateHeaderTitle()) {
            this.htmlElement.classList.add("hasTitle");
        }

        this.containerElement = this.htmlElement.querySelector(".widthKeeper .container");
        this.headerElement = this.htmlElement.querySelector(".headerBar > h1");

        if (this.headerElement) {
            this.trackClicks(this.headerElement, this.onBackButton);
        }

        this.dialogs = new HUDModalDialogs(null, this.app);
        const dialogsElement = document.body.querySelector(".modalDialogParent");
        this.dialogs.initializeToElement(dialogsElement);

        this.onEnter(payload);
    }
}
