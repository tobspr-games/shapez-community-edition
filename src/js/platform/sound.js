/* typehints:start */
import { Application } from "../application";
import { Vector } from "../core/vector";
import { GameRoot } from "../game/root";
/* typehints:end */

import { newEmptyMap, clamp } from "../core/utils";
import { createLogger } from "../core/logging";
import { globalConfig } from "../core/config";
import { Howl, Howler } from "howler";

// @ts-ignore
import sprites from "../built-temp/sfx.json";

const logger = createLogger("sound");

export const SOUNDS = {
    // Menu and such
    uiClick: "ui_click",
    uiError: "ui_error",
    dialogError: "dialog_error",
    dialogOk: "dialog_ok",
    swishHide: "ui_swish_hide",
    swishShow: "ui_swish_show",
    badgeNotification: "badge_notification",

    levelComplete: "level_complete",

    destroyBuilding: "destroy_building",
    placeBuilding: "place_building",
    placeBelt: "place_belt",
    copy: "copy",
    unlockUpgrade: "unlock_upgrade",
    tutorialStep: "tutorial_step",
};

export const MUSIC = {
    // The theme always depends on the standalone only, even if running the full
    // version in the browser
    theme: "theme-full",
};

MUSIC.menu = "menu";

MUSIC.puzzle = "puzzle-full";

export class SoundInstanceInterface {
    constructor(key, url) {
        this.key = key;
        this.url = url;
    }

    /** @returns {Promise<void>} */
    load() {
        abstract;
        return Promise.resolve();
    }

    play(volume) {
        abstract;
    }

    deinitialize() {}
}

export class MusicInstanceInterface {
    constructor(key, url) {
        this.key = key;
        this.url = url;
    }

    stop() {
        abstract;
    }

    play(volume) {
        abstract;
    }

    setVolume(volume) {
        abstract;
    }

    /** @returns {Promise<void>} */
    load() {
        abstract;
        return Promise.resolve();
    }

    /** @returns {boolean} */
    isPlaying() {
        abstract;
        return false;
    }

    deinitialize() {}
}

export class SoundInterface {
    constructor(app, soundClass, musicClass) {
        /** @type {Application} */
        this.app = app;

        this.soundClass = soundClass;
        this.musicClass = musicClass;

        /** @type {Object<string, SoundInstanceInterface>} */
        this.sounds = newEmptyMap();

        /** @type {Object<string, MusicInstanceInterface>} */
        this.music = newEmptyMap();

        /** @type {MusicInstanceInterface} */
        this.currentMusic = null;

        this.pageIsVisible = true;

        this.musicVolume = 1.0;
        this.soundVolume = 1.0;
    }

    /**
     * Initializes the sound
     * @returns {Promise<any>}
     */
    initialize() {
        for (const soundKey in SOUNDS) {
            const soundPath = SOUNDS[soundKey];
            const sound = new this.soundClass(soundKey, soundPath);
            this.sounds[soundPath] = sound;
        }

        for (const musicKey in MUSIC) {
            const musicPath = MUSIC[musicKey];
            const music = new this.musicClass(musicKey, musicPath);
            this.music[musicPath] = music;
        }

        this.musicVolume = this.app.settings.getAllSettings().musicVolume;
        this.soundVolume = this.app.settings.getAllSettings().soundVolume;

        if (G_IS_DEV && globalConfig.debug.disableMusic) {
            this.musicVolume = 0.0;
        }

        return Promise.resolve();
    }

    /**
     * Pre-Loads the given sounds
     * @param {string} key
     * @returns {Promise<void>}
     */
    loadSound(key) {
        if (!key) {
            return Promise.resolve();
        }
        if (this.sounds[key]) {
            return this.sounds[key].load();
        } else if (this.music[key]) {
            return this.music[key].load();
        } else {
            logger.warn("Sound/Music by key not found:", key);
            return Promise.resolve();
        }
    }

    /** Deinits the sound
     * @returns {Promise<void>}
     */
    deinitialize() {
        const promises = [];
        for (const key in this.sounds) {
            promises.push(this.sounds[key].deinitialize());
        }
        for (const key in this.music) {
            promises.push(this.music[key].deinitialize());
        }
        // @ts-ignore
        return Promise.all(...promises);
    }

    /**
     * Returns the music volume
     * @returns {number}
     */
    getMusicVolume() {
        return this.musicVolume;
    }

    /**
     * Returns the sound volume
     * @returns {number}
     */
    getSoundVolume() {
        return this.soundVolume;
    }

    /**
     * Sets the music volume
     * @param {number} volume
     */
    setMusicVolume(volume) {
        this.musicVolume = clamp(volume, 0, 1);
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.musicVolume);
        }
    }

    /**
     * Sets the sound volume
     * @param {number} volume
     */
    setSoundVolume(volume) {
        this.soundVolume = clamp(volume, 0, 1);
    }

    /**
     * Focus change handler, called by the pap
     * @param {boolean} pageIsVisible
     */
    onPageRenderableStateChanged(pageIsVisible) {
        this.pageIsVisible = pageIsVisible;
        if (this.currentMusic) {
            if (pageIsVisible) {
                if (!this.currentMusic.isPlaying()) {
                    this.currentMusic.play(this.musicVolume);
                }
            } else {
                this.currentMusic.stop();
            }
        }
    }

    /**
     * @param {string} key
     */
    playUiSound(key) {
        if (!this.sounds[key]) {
            logger.warn("Sound", key, "not found, probably not loaded yet");
            return;
        }
        this.sounds[key].play(this.soundVolume);
    }

    /**
     *
     * @param {string} key
     * @param {Vector} worldPosition
     * @param {GameRoot} root
     */
    play3DSound(key, worldPosition, root) {
        if (!this.sounds[key]) {
            logger.warn("Music", key, "not found, probably not loaded yet");
            return;
        }
        if (!this.pageIsVisible) {
            return;
        }

        // hack, but works
        if (root.time.getIsPaused()) {
            return;
        }

        let volume = this.soundVolume;
        if (!root.camera.isWorldPointOnScreen(worldPosition)) {
            volume = this.soundVolume / 5; // In the old implementation this value was fixed to 0.2 => 20% of 1.0
        }
        volume *= clamp(root.camera.zoomLevel / 3);
        this.sounds[key].play(clamp(volume));
    }

    /**
     * @param {string} key
     */
    playThemeMusic(key) {
        const music = this.music[key];
        if (key && !music) {
            logger.warn("Music", key, "not found");
        }
        if (this.currentMusic !== music) {
            if (this.currentMusic) {
                logger.log("Stopping", this.currentMusic.key);
                this.currentMusic.stop();
            }
            this.currentMusic = music;
            if (music && this.pageIsVisible) {
                logger.log("Starting", this.currentMusic.key);
                music.play(this.musicVolume);
            }
        }
    }
}

class SoundSpritesContainer {
    constructor() {
        this.howl = null;

        this.loadingPromise = null;
    }

    load() {
        if (this.loadingPromise) {
            return this.loadingPromise;
        }
        return (this.loadingPromise = new Promise(resolve => {
            this.howl = new Howl({
                src: "res/sounds/sfx.mp3",
                sprite: sprites.sprite,
                autoplay: false,
                loop: false,
                volume: 0,
                preload: true,
                pool: 20,
                onload: () => {
                    resolve();
                },
                onloaderror: (id, err) => {
                    logger.warn("SFX failed to load:", id, err);
                    this.howl = null;
                    resolve();
                },
                onplayerror: (id, err) => {
                    logger.warn("SFX failed to play:", id, err);
                },
            });
        }));
    }

    play(volume, key) {
        if (this.howl) {
            const instance = this.howl.play(key);
            this.howl.volume(volume, instance);
        }
    }

    deinitialize() {
        if (this.howl) {
            this.howl.unload();
            this.howl = null;
        }
    }
}

class WrappedSoundInstance extends SoundInstanceInterface {
    /**
     *
     * @param {SoundSpritesContainer} spriteContainer
     * @param {string} key
     */
    constructor(spriteContainer, key) {
        super(key, "sfx.mp3");
        this.spriteContainer = spriteContainer;
    }

    /** @returns {Promise<void>} */
    load() {
        return this.spriteContainer.load();
    }

    play(volume) {
        this.spriteContainer.play(volume, this.key);
    }

    deinitialize() {
        return this.spriteContainer.deinitialize();
    }
}

class MusicInstance extends MusicInstanceInterface {
    constructor(key, url) {
        super(key, url);
        this.howl = null;
        this.instance = null;
        this.playing = false;
    }
    load() {
        return new Promise((resolve, reject) => {
            this.howl = new Howl({
                src: "res/sounds/music/" + this.url + ".mp3",
                autoplay: false,
                loop: true,
                html5: true,
                volume: 1,
                preload: true,
                pool: 2,

                onunlock: () => {
                    if (this.playing) {
                        logger.log("Playing music after manual unlock");
                        this.play();
                    }
                },

                onload: () => {
                    resolve();
                },
                onloaderror: (id, err) => {
                    logger.warn(this, "Music", this.url, "failed to load:", id, err);
                    this.howl = null;
                    resolve();
                },

                onplayerror: (id, err) => {
                    logger.warn(this, "Music", this.url, "failed to play:", id, err);
                },
            });
        });
    }

    stop() {
        if (this.howl && this.instance) {
            this.playing = false;
            this.howl.pause(this.instance);
        }
    }

    isPlaying() {
        return this.playing;
    }

    play(volume) {
        if (this.howl) {
            this.playing = true;
            this.howl.volume(volume);
            if (this.instance) {
                this.howl.play(this.instance);
            } else {
                this.instance = this.howl.play();
            }
        }
    }

    setVolume(volume) {
        if (this.howl) {
            this.howl.volume(volume);
        }
    }

    deinitialize() {
        if (this.howl) {
            this.howl.unload();
            this.howl = null;
            this.instance = null;
        }
    }
}

export class Sound extends SoundInterface {
    constructor(app) {
        Howler.mobileAutoEnable = true;
        Howler.autoUnlock = true;
        Howler.autoSuspend = false;
        Howler.html5PoolSize = 20;
        Howler.pos(0, 0, 0);

        super(app, WrappedSoundInstance, MusicInstance);
    }

    initialize() {
        // NOTICE: We override the initialize() method here with custom logic because
        // we have a sound sprites instance

        this.sfxHandle = new SoundSpritesContainer();

        // @ts-ignore
        const keys = Object.values(SOUNDS);
        keys.forEach(key => {
            this.sounds[key] = new WrappedSoundInstance(this.sfxHandle, key);
        });
        for (const musicKey in MUSIC) {
            const musicPath = MUSIC[musicKey];
            const music = new this.musicClass(musicKey, musicPath);
            this.music[musicPath] = music;
        }

        this.musicVolume = this.app.settings.getAllSettings().musicVolume;
        this.soundVolume = this.app.settings.getAllSettings().soundVolume;

        if (G_IS_DEV && globalConfig.debug.disableMusic) {
            this.musicVolume = 0.0;
        }

        return Promise.resolve();
    }

    deinitialize() {
        return super.deinitialize().then(() => Howler.unload());
    }
}
