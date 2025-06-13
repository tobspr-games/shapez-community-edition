import { newEmptyMap, clamp } from "../core/utils";
import { createLogger } from "../core/logging";
import { globalConfig } from "../core/config";
import { Application } from "@/application";
import { Vector } from "@/core/vector";
import { GameRoot } from "@/core/draw_parameters";

const logger = createLogger("sound");

export const SOUNDS = {
    uiClick: "ui_click.ogg",
    uiError: "ui_error.ogg",
    dialogError: "dialog_error.ogg",
    dialogOk: "dialog_ok.ogg",
    swishHide: "ui_swish_hide.ogg",
    swishShow: "ui_swish_show.ogg",
    badgeNotification: "badge_notification.ogg",

    levelComplete: "level_complete.ogg",

    destroyBuilding: "destroy_building.ogg",
    placeBuilding: "place_building.ogg",
    placeBelt: "place_belt.ogg",
    copy: "copy.ogg",
    unlockUpgrade: "unlock_upgrade.ogg",
    tutorialStep: "tutorial_step.ogg",
};

export const MUSIC = {
    ingame: {
        beltsgobrrrr: "theme/BeltsGoBrrrr.ogg",
        blueprint: "theme/Blueprint.ogg",
        chiliagon: "theme/Chiliagon.ogg",
        heptagon: "theme/Heptagon.ogg",
        rectangle: "theme/Rectangle.ogg",
        rhombus: "theme/Rhombus.ogg",
        semicircle: "theme/Semicircle.ogg",
        square: "theme/Square.ogg",
        triangle: "theme/Triangle.ogg",
        windmill: "theme/Windmill.ogg",
    },
    puzzle: {
        combine: "puzzle/Combine.ogg",
        complete: "puzzle/Complete.ogg",
        rethink: "puzzle/Rethink.ogg",
        split: "puzzle/Split.ogg",
        think: "puzzle/Think.ogg",
    },
    menu: {
        menu: "menu.ogg",
    },
};

function isObject(item: unknown): item is object {
    return typeof item === "object" && !Array.isArray(item) && item !== null;
}

function deepForEachProp(
    obj: Record<string, Record<string, string> | string>,
    closure: (key: string, value: string, upperKey: string) => void,
    upperKey: keyof typeof obj = ""
) {
    for (const [key, value] of Object.entries(obj)) {
        if (isObject(value)) {
            deepForEachProp(value, closure, key);
        } else {
            closure(key, value, upperKey);
        }
    }
}

// https://stackoverflow.com/a/37401010
// https://stackoverflow.com/a/70766304
function randomValueFromObject<T extends object>(obj: T): T[keyof T] {
    return obj[Object.keys(obj)[~~(Math.random() * Object.keys(obj).length)]];
}

interface SoundInstanceInterface {
    load(): Promise<void>;
    play(volume: number): void;
    deinitialize(): Promise<void>;
}

interface MusicInstanceInterface {
    stop(): void;
    play(volume: number): void;
    setVolume(volume: number): void;
    load(): Promise<void>;
    isPlaying(): boolean;
    deinitialize(): Promise<void>;
}

class SoundInstance implements SoundInstanceInterface {
    protected readonly path: string;
    protected ctx: AudioContext;
    protected gainNode: GainNode;
    elm: HTMLAudioElement;
    protected track: MediaElementAudioSourceNode;
    readonly key: string;

    constructor(key: string, path: string) {
        this.path = path;
        this.key = key;
        this.ctx = null;
        this.elm = null;
        this.gainNode = null;
        this.track = null;
    }

    load(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                this.ctx = new AudioContext();
                this.elm = document.createElement("audio");
                this.elm.src = this.path;
                document.head.appendChild(this.elm);
                this.gainNode = this.ctx.createGain();
                this.track = this.ctx.createMediaElementSource(this.elm);
                this.track.connect(this.gainNode).connect(this.ctx.destination);
            } catch (e) {
                reject(e);
                return;
            }
            resolve();
        });
    }

    play(volume: number) {
        if (this.elm && this.gainNode) {
            this.gainNode.gain.value = volume;
            this.elm.currentTime = 0;
            this.elm.play();
        }
    }

    deinitialize(): Promise<void> {
        if (!this.ctx) {
            return Promise.resolve();
        }
        return new Promise<void>((resolve, reject) => {
            try {
                this.track = null;
                this.ctx.suspend();
                this.ctx = null;
                this.gainNode = null;
                this.elm.remove();
                this.elm = null;
            } catch (e) {
                reject(e);
                return;
            }
            resolve();
        });
    }
}

class MusicInstance extends SoundInstance implements MusicInstanceInterface {
    readonly type: string;
    constructor(key: string, path: string, type: string) {
        super(key, path);
        this.type = type;
    }

    stop() {
        if (this.elm) {
            this.elm.pause();
        }
    }

    isPlaying() {
        return this.elm && !this.elm.paused;
    }

    setVolume(volume: number) {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }
}

export class Sound {
    app: Application;
    sounds: Record<string, SoundInstance>;
    music: Record<string, MusicInstance>;
    currentMusic: MusicInstance;
    pageIsVisible: boolean;
    musicVolume: number;
    soundVolume: number;

    constructor(app: Application) {
        this.app = app;

        this.sounds = newEmptyMap();
        this.music = newEmptyMap();

        this.currentMusic = null;

        this.pageIsVisible = true;

        this.musicVolume = 1.0;
        this.soundVolume = 1.0;
    }

    /**
     * Initializes the sound
     */
    initialize() {
        deepForEachProp(MUSIC, (musicKey, musicPath, musicType) => {
            this.music[musicPath] = new MusicInstance(musicKey, `res/sounds/music/${musicPath}`, musicType);
        });
        deepForEachProp(SOUNDS, (soundKey, soundPath) => {
            this.sounds[soundPath] = new SoundInstance(soundKey, `res/sounds/${soundPath}`);
        });

        this.musicVolume = this.app.settings.getAllSettings().musicVolume;
        this.soundVolume = this.app.settings.getAllSettings().soundVolume;

        if (G_IS_DEV && globalConfig.debug.disableMusic) {
            this.musicVolume = 0.0;
        }

        return Promise.resolve();
    }

    /**
     * Pre-Loads the given sounds
     */
    loadSound(key: string): Promise<void | void[]> {
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

    /**
     * Deinits the sound
     */
    deinitialize(): Promise<void[]> {
        const promises: Promise<void>[] = [];
        for (const key in this.sounds) {
            promises.push(this.sounds[key].deinitialize());
        }
        for (const key in this.music) {
            promises.push(this.music[key].deinitialize());
        }
        return Promise.all(promises);
    }

    /**
     * Returns the music volume
     * @returns {number}
     */
    getMusicVolume(): number {
        return this.musicVolume;
    }

    /**
     * Returns the sound volume
     * @returns {number}
     */
    getSoundVolume(): number {
        return this.soundVolume;
    }

    /**
     * Sets the music volume
     * @param {number} volume
     */
    setMusicVolume(volume: number) {
        this.musicVolume = clamp(volume, 0, 1);
        if (this.currentMusic) {
            this.currentMusic.setVolume(this.musicVolume);
        }
    }

    /**
     * Sets the sound volume
     * @param {number} volume
     */
    setSoundVolume(volume: number) {
        this.soundVolume = clamp(volume, 0, 1);
    }

    /**
     * Focus change handler, called by the pap
     */
    onPageRenderableStateChanged(pageIsVisible: boolean) {
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

    playUiSound(key: string) {
        if (!this.sounds[key]) {
            logger.warn("Sound", key, "not found, probably not loaded yet");
            return;
        }
        this.sounds[key].play(this.soundVolume);
    }

    play3DSound(key: string, worldPosition: Vector, root: GameRoot) {
        if (!this.sounds[key]) {
            logger.warn("Sound", key, "not found, probably not loaded yet");
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

    playThemeMusic({ type, shuffle }: { type: string; shuffle: boolean }) {
        if (!(type in MUSIC)) {
            logger.warn(`Music type ${type} not found in MUSIC`);
            return;
        }
        if (this.currentMusic && this.currentMusic.type === type) {
            return;
        }
        if (this.currentMusic) {
            this.stopThemeMusic();
        }
        for (const path of Object.values(MUSIC[type])) {
            // @ts-expect-error Typescript thinks `type` isn't a key of `MUSIC`
            this.music[path].elm.onended = () => {
                if (shuffle) {
                    this.music[randomValueFromObject(MUSIC[this.currentMusic.type])].play(this.musicVolume);
                }
            };
        }
        (this.currentMusic = this.music[randomValueFromObject(MUSIC[type])]).play(this.musicVolume);
    }

    stopThemeMusic() {
        // TODO: add more options for smoothing out and other stuff
        this.currentMusic.stop();
    }
}
