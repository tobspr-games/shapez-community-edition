/* typehints:start */
import { Application } from "../application";
/* typehints:end */

import { initSpriteCache } from "../game/meta_building_registry";
import { MUSIC, SOUNDS } from "../platform/sound";
import { T } from "../translations";
import { AtlasDefinition, atlasFiles } from "./atlas_definitions";
import { Loader } from "./loader";
import { Logger } from "./logging";
import { Signal } from "./signal";
import { clamp, timeoutPromise } from "./utils";

const logger = new Logger("background_loader");

const MAIN_MENU_ASSETS = {
    sprites: ["logo.png"],
    sounds: [...Object.values(MUSIC), ...Object.values(SOUNDS)],
    atlas: [],
    css: [],
};

const INGAME_ASSETS = {
    sprites: [],
    sounds: [],
    atlas: atlasFiles,
    css: ["async-resources.css"],
};

const LOADER_TIMEOUT_PER_RESOURCE = 180000;

export class BackgroundResourcesLoader {
    /**
     *
     * @param {Application} app
     */
    constructor(app) {
        this.app = app;

        this.mainMenuPromise = null;
        this.ingamePromise = null;

        /** @type {Signal<[{ progress: number }]>} */
        this.resourceStateChangedSignal = new Signal();
    }

    getMainMenuPromise() {
        if (this.mainMenuPromise) {
            return this.mainMenuPromise;
        }

        logger.log("⏰ Loading main menu assets");
        return (this.mainMenuPromise = this.loadAssets(MAIN_MENU_ASSETS));
    }

    getIngamePromise() {
        if (this.ingamePromise) {
            return this.ingamePromise;
        }
        logger.log("⏰ Loading ingame assets");
        const promise = this.loadAssets(INGAME_ASSETS).then(() => initSpriteCache());
        return (this.ingamePromise = promise);
    }

    /**
     *
     * @param {object} param0
     * @param {string[]} param0.sprites
     * @param {string[]} param0.sounds
     * @param {AtlasDefinition[]} param0.atlas
     * @param {string[]} param0.css
     */
    async loadAssets({ sprites, sounds, atlas, css }) {
        /**
         * @type {((progressHandler: (progress: number) => void) => Promise<void>)[]}
         */
        const promiseFunctions = [];

        // CSS
        for (const url of css) {
            promiseFunctions.push(progress =>
                timeoutPromise(this.internalPreloadCss(url, progress), LOADER_TIMEOUT_PER_RESOURCE).catch(
                    err => {
                        logger.error("Failed to load css:", url, err);
                        throw new Error("HUD Stylesheet " + url + " failed to load: " + err);
                    }
                )
            );
        }

        // ATLAS FILES
        for (const url of atlas) {
            promiseFunctions.push(progress =>
                timeoutPromise(Loader.preloadAtlas(url, progress), LOADER_TIMEOUT_PER_RESOURCE).catch(err => {
                    logger.error("Failed to load atlas:", url.sourceFileName, err);
                    throw new Error("Atlas " + url.sourceFileName + " failed to load: " + err);
                })
            );
        }

        // HUD Sprites
        for (const url of sprites) {
            promiseFunctions.push(progress =>
                timeoutPromise(Loader.preloadCSSSprite(url, progress), LOADER_TIMEOUT_PER_RESOURCE).catch(
                    err => {
                        logger.error("Failed to load css sprite:", url, err);
                        throw new Error("HUD Sprite " + url + " failed to load: " + err);
                    }
                )
            );
        }

        // SFX & Music
        for (const url of sounds) {
            promiseFunctions.push(() =>
                timeoutPromise(this.app.sound.loadSound(url), LOADER_TIMEOUT_PER_RESOURCE).catch(err => {
                    logger.warn("Failed to load sound, will not be available:", url, err);
                })
            );
        }

        const originalAmount = promiseFunctions.length;
        const start = performance.now();

        logger.log("⏰ Preloading", originalAmount, "assets");

        let progress = 0;
        this.resourceStateChangedSignal.dispatch({ progress });
        const promises = [];

        for (const promiseFunction of promiseFunctions) {
            let lastIndividualProgress = 0;
            const progressHandler = individualProgress => {
                const delta = clamp(individualProgress) - lastIndividualProgress;
                lastIndividualProgress = clamp(individualProgress);
                progress += delta / originalAmount;
                this.resourceStateChangedSignal.dispatch({ progress });
            };
            promises.push(
                promiseFunction(progressHandler).then(() => {
                    progressHandler(1);
                })
            );
        }
        await Promise.all(promises);

        logger.log("⏰ Preloaded assets in", Math.round(performance.now() - start), "ms");
    }

    /**
     * Shows an error when a resource failed to load and allows to reload the game
     */
    showLoaderError(dialogs, err) {
        dialogs
            .showWarning(
                T.dialogs.resourceLoadFailed.title,
                T.dialogs.resourceLoadFailed.descSteamDemo + "<br>" + err,
                ["retry"]
            )
            .retry.add(() => window.location.reload());
    }

    preloadWithProgress(src, progressHandler) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open("GET", src, true);
            xhr.responseType = "arraybuffer";
            xhr.onprogress = function (ev) {
                if (ev.lengthComputable) {
                    progressHandler(ev.loaded / ev.total);
                }
            };

            xhr.onloadend = function () {
                if (!xhr.status.toString().match(/^2/)) {
                    reject(src + ": " + xhr.status + " " + xhr.statusText);
                } else {
                    const options = {};
                    const headers = xhr.getAllResponseHeaders();
                    const contentType = headers.match(/^Content-Type:\s*(.*?)$/im);
                    if (contentType && contentType[1]) {
                        options.type = contentType[1].split(";")[0];
                    }
                    const blob = new Blob([this.response], options);
                    resolve(window.URL.createObjectURL(blob));
                }
            };
            xhr.send();
        });
    }

    internalPreloadCss(src, progressHandler) {
        return this.preloadWithProgress(src, progressHandler).then(blobSrc => {
            const styleElement = document.createElement("link");
            styleElement.href = blobSrc;
            styleElement.rel = "stylesheet";
            styleElement.setAttribute("media", "all");
            styleElement.type = "text/css";
            document.head.appendChild(styleElement);
        });
    }
}
