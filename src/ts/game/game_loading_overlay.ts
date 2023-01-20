import type { Application } from "../application";

import { randomChoice } from "../core/utils";
import { T } from "../translations";

export class GameLoadingOverlay {
    public element: HTMLElement = null;
    public loadingIndicator: HTMLSpanElement;

    constructor(public app: Application, public parent: HTMLElement) {}

    /** Removes the overlay if its currently visible */
    removeIfAttached() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    /** Returns if the loading overlay is attached */
    isAttached() {
        return this.element;
    }

    /** Shows a super basic overlay */
    showBasic() {
        assert(!this.element, "Loading overlay already visible, cant show again");
        this.element = document.createElement("div");
        this.element.classList.add("gameLoadingOverlay");
        this.parent.appendChild(this.element);
        this.internalAddSpinnerAndText(this.element);
        this.internalAddHint(this.element);
        this.internalAddProgressIndicator(this.element);
    }

    /** Adds a text with 'loading' and a spinner */
    internalAddSpinnerAndText(element: HTMLElement) {
        const inner = document.createElement("span");
        inner.classList.add("prefab_LoadingTextWithAnim");
        element.appendChild(inner);
    }

    /** Adds a random hint */
    internalAddHint(element: HTMLElement) {
        const hint = document.createElement("span");
        hint.innerHTML = randomChoice(T.tips);
        hint.classList.add("prefab_GameHint");
        element.appendChild(hint);
    }

    internalAddProgressIndicator(element) {
        const indicator = document.createElement("span");
        indicator.innerHTML = "";
        indicator.classList.add("prefab_LoadingProgressIndicator");
        element.appendChild(indicator);
        this.loadingIndicator = indicator;
    }
}
