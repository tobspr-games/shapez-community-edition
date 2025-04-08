import { GLOBAL_APP } from "@/core/globals";
import { FsError } from "@/platform/fs_error";
import { createLogger } from "../core/logging";
import { Storage } from "../platform/storage";
import { Mod } from "./mod";
import { ModInterface } from "./mod_interface";
import { MOD_SIGNALS } from "./mod_signals";

const LOG = createLogger("mods");

/**
 * @typedef {{
 *   name: string;
 *   version: string;
 *   author: string;
 *   website: string;
 *   description: string;
 *   id: string;
 *   settings: [];
 *   doesNotAffectSavegame?: boolean
 * }} ModMetadata
 */

export class ModLoader {
    constructor() {
        LOG.log("modloader created");

        /** @type {Mod[]} */
        this.mods = [];

        this.modInterface = new ModInterface(this);

        /** @type {({ meta: ModMetadata, modClass: typeof Mod})[]} */
        this.modLoadQueue = [];

        this.initialized = false;

        this.signals = MOD_SIGNALS;
    }

    get app() {
        return GLOBAL_APP;
    }

    anyModsActive() {
        return this.mods.length > 0;
    }

    /**
     *
     * @returns {import("../savegame/savegame_typedefs").SavegameStoredMods}
     */
    getModsListForSavegame() {
        return this.mods
            .filter(mod => !mod.metadata.doesNotAffectSavegame)
            .map(mod => ({
                id: mod.metadata.id,
                version: mod.metadata.version,
                website: mod.metadata.website,
                name: mod.metadata.name,
                author: mod.metadata.author,
            }));
    }

    /**
     *
     * @param {import("../savegame/savegame_typedefs").SavegameStoredMods} originalMods
     */
    computeModDifference(originalMods) {
        /**
         * @type {import("../savegame/savegame_typedefs").SavegameStoredMods}
         */
        let missing = [];

        const current = this.getModsListForSavegame();

        originalMods.forEach(mod => {
            for (let i = 0; i < current.length; ++i) {
                const currentMod = current[i];
                if (currentMod.id === mod.id && currentMod.version === mod.version) {
                    current.splice(i, 1);
                    return;
                }
            }
            missing.push(mod);
        });

        return {
            missing,
            extra: current,
        };
    }

    exposeExports() {
        const exports = {};
        const modules = import.meta.webpackContext("../", {
            recursive: true,
            regExp: /\.[jt]sx?$/,
            exclude: /\.d\.ts$/,
        });

        Array.from(modules.keys()).forEach(key => {
            /** @type {object} */
            const module = modules(key);
            for (const member in module) {
                if (member === "default") {
                    continue;
                }
                if (exports[member]) {
                    throw new Error("Duplicate export of " + member);
                }

                Object.defineProperty(exports, member, {
                    get() {
                        return module[member];
                    },
                });
            }
        });

        window.shapez = exports;
    }

    async initMods() {
        // Create a storage for reading mod settings
        const storage = new Storage(this.app);
        await storage.initialize();

        LOG.log("hook:init", this.app, this.app.storage);
        this.exposeExports();

        // TODO: Make use of the passed file name, or wait for ModV2
        let mods = await ipcRenderer.invoke("get-mods");
        mods = mods.map(mod => mod.source);

        window.$shapez_registerMod = (modClass, meta) => {
            if (this.initialized) {
                throw new Error("Can't register mod after modloader is initialized");
            }
            if (this.modLoadQueue.some(entry => entry.meta.id === meta.id)) {
                console.warn("Not registering mod", meta, "since a mod with the same id is already loaded");
                return;
            }
            this.modLoadQueue.push({
                modClass,
                meta,
            });
        };

        mods.forEach(modCode => {
            modCode += `
                        if (typeof Mod !== 'undefined') {
                            if (typeof METADATA !== 'object') {
                                throw new Error("No METADATA variable found");
                            }
                            window.$shapez_registerMod(Mod, METADATA);
                        }
                    `;
            try {
                const func = new Function(modCode);
                func();
            } catch (ex) {
                console.error(ex);
                alert("Failed to parse mod (launch with --dev for more info): \n\n" + ex);
            }
        });

        delete window.$shapez_registerMod;

        for (let i = 0; i < this.modLoadQueue.length; i++) {
            const { modClass, meta } = this.modLoadQueue[i];
            const modDataFile = "modsettings_" + meta.id + "__" + meta.version + ".json";

            let settings = meta.settings;

            if (meta.settings) {
                try {
                    const storedSettings = await storage.readFileAsync(modDataFile);
                    settings = JSON.parse(storedSettings);
                } catch (ex) {
                    if (ex instanceof FsError && ex.isFileNotFound()) {
                        // Write default data
                        await storage.writeFileAsync(modDataFile, JSON.stringify(meta.settings));
                    } else {
                        alert("Failed to load settings for " + meta.id + ", will use defaults:\n\n" + ex);
                    }
                }
            }

            try {
                const mod = new modClass({
                    app: this.app,
                    modLoader: this,
                    meta,
                    settings,
                    saveSettings: () => storage.writeFileAsync(modDataFile, JSON.stringify(mod.settings)),
                });
                await mod.init();
                this.mods.push(mod);
            } catch (ex) {
                console.error(ex);
                alert("Failed to initialize mods (launch with --dev for more info): \n\n" + ex);
            }
        }

        this.modLoadQueue = [];
        this.initialized = true;
    }
}

export const MODS = new ModLoader();
