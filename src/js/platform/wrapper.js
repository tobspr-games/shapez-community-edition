/* typehints:start */
import { Application } from "../application";
/* typehints:end */

import { IS_MOBILE } from "../core/config";
import { createLogger } from "../core/logging";
import { clamp } from "../core/utils";
import { NoAchievementProvider } from "./no_achievement_provider";

const logger = createLogger("electron-wrapper");

export class PlatformWrapperImplElectron {
    constructor(app) {
        /** @type {Application} */
        this.app = app;
    }

    initialize() {
        return this.initializeAchievementProvider().then(() => {
            document.documentElement.classList.add("p-" + this.getId());
            return Promise.resolve();
        });
    }

    getId() {
        return "electron";
    }

    getSupportsRestart() {
        return true;
    }

    /**
     * Attempt to open an external url
     * @param {string} url
     */
    openExternalLink(url) {
        logger.log(this, "Opening external:", url);
        location.replace(url);
    }

    /**
     * Returns the strength of touch pans with the mouse
     */
    getTouchPanStrength() {
        return 1;
    }

    /**
     * Should return if this platform supports ads at all
     */
    getSupportsAds() {
        return false;
    }

    /**
     * Attempt to restart the app
     */
    performRestart() {
        logger.log(this, "Performing restart");
        window.location.reload();
    }

    initializeAchievementProvider() {
        return this.app.achievementProvider.initialize().catch(err => {
            logger.error("Failed to initialize achievement provider, disabling:", err);

            this.app.achievementProvider = new NoAchievementProvider(this.app);
        });
    }

    /**
     * Returns the UI scale, called on every resize
     * @returns {number} */
    getUiScale() {
        if (IS_MOBILE) {
            return 1;
        }

        const avgDims = Math.min(this.app.screenWidth, this.app.screenHeight);
        return clamp((avgDims / 1000.0) * 1.9, 0.1, 10);
    }

    /**
     * Returns whether this platform supports a toggleable fullscreen
     */
    getSupportsFullscreen() {
        return true;
    }

    /**
     * Should set the apps fullscreen state to the desired state
     * @param {boolean} flag
     */
    setFullscreen(flag) {
        ipcRenderer.invoke("set-fullscreen", flag);
    }

    getSupportsAppExit() {
        return true;
    }

    /**
     * Attempts to quit the app
     */
    exitApp() {
        window.close();
    }

    /**
     * Whether this platform supports a keyboard
     */
    getSupportsKeyboard() {
        return true;
    }

    /**
     * Should return the minimum supported zoom level
     * @returns {number}
     */
    getMinimumZoom() {
        return 0.1 * this.getScreenScale();
    }

    /**
     * Should return the maximum supported zoom level
     * @returns {number}
     */
    getMaximumZoom() {
        return 3.5 * this.getScreenScale();
    }

    getScreenScale() {
        return Math.min(window.innerWidth, window.innerHeight) / 1024.0;
    }
}
