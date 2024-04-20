import { GameState } from "../core/game_state";

export class MobileWarningState extends GameState {
    constructor() {
        super("MobileWarningState");
    }

    getInnerHTML() {
        return `

            <img class="logo" src="res/logo.png" alt="shapez.io Logo">

            <p>I'm sorry, but shapez.io is not available on mobile devices yet!</p>
            <p>If you have a desktop device, you can get shapez on Steam:</p>


            <a href="https://get.shapez.io/shapez_mobile" class="standaloneLink" target="_blank">Play on Steam!</a>
        `;
    }

    getThemeMusic() {
        return null;
    }

    getHasFadeIn() {
        return false;
    }

    onLeave() {
        // this.dialogs.cleanup();
    }
}
