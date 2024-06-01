/* typehints:start */
import { Application } from "../application";
import { ModLoader } from "./modloader";
/* typehints:end */

import { MOD_SIGNALS } from "./mod_signals";

export class Mod {
    /**
     * @param {object} param0
     * @param {Application} param0.app
     * @param {ModLoader} param0.modLoader
     * @param {import("./modloader").ModMetadata} param0.meta
     * @param {Object} param0.settings
     * @param {string} param0.path
     * @param {() => Promise<void>} param0.saveSettings
     */
    constructor({ app, modLoader, meta, settings, saveSettings, path }) {
        this.app = app;
        this.modLoader = modLoader;
        this.metadata = meta;
        this.path = path;
        this.disabled = path.endsWith(".js.disabled");

        this.signals = MOD_SIGNALS;
        this.modInterface = modLoader.modInterface;

        this.settings = settings;
        this.saveSettings = saveSettings;
    }

    init() {
        // to be overridden
    }

    get dialogs() {
        return this.modInterface.dialogs;
    }
}
