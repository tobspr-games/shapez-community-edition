/* typehints:start */
import { GameRoot } from "./root";
/* typehints:end */

import { SOUNDS } from "../platform/sound";

const avgSoundDurationSeconds = 0.1;
const maxOngoingUiSounds = 5;

// Proxy to the application sound instance
export class SoundProxy {
    /**
     * @param {GameRoot} root
     */
    constructor(root) {
        this.root = root;

        // Store a list of sounds and when we started them
        this.playingUiSounds = [];
    }

    /**
     * Plays a new ui sound
     * @param {string} id Sound ID
     */
    playUi(id) {
        assert(typeof id === "string", "Not a valid sound id: " + id);
        this.internalUpdateOngoingSounds();
        if (this.playingUiSounds.length > maxOngoingUiSounds) {
            // Too many ongoing sounds
            return false;
        }

        this.root.app.sound.playUiSound(id);
        this.playingUiSounds.push(this.root.time.realtimeNow());
    }

    /**
     * Plays the ui click sound
     */
    playUiClick() {
        this.playUi(SOUNDS.uiClick);
    }

    /**
     * Plays the ui error sound
     */
    playUiError() {
        this.playUi(SOUNDS.uiError);
    }

    /**
     * Updates the list of ongoing sounds
     */
    internalUpdateOngoingSounds() {
        const now = this.root.time.realtimeNow();

        for (let i = 0; i < this.playingUiSounds.length; ++i) {
            if (now - this.playingUiSounds[i] > avgSoundDurationSeconds) {
                this.playingUiSounds.splice(i, 1);
                i -= 1;
            }
        }
    }
}
