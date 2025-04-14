import { globalConfig } from "../core/config";
import { ExplainedResult } from "../core/explained_result";
import { createLogger } from "../core/logging";
import { ReadWriteProxy } from "../core/read_write_proxy";
import { MODS } from "../mods/modloader";
import { BaseSavegameInterface } from "./savegame_interface";
import { getSavegameInterface, savegameInterfaces } from "./savegame_interface_registry";
import { SavegameSerializer } from "./savegame_serializer";

const logger = createLogger("savegame");

/**
 * @typedef {import("../application").Application} Application
 * @typedef {import("../game/root").GameRoot} GameRoot
 * @typedef {import("./savegame_typedefs").SavegameData} SavegameData
 * @typedef {import("./savegame_typedefs").SavegameMetadata} SavegameMetadata
 * @typedef {import("./savegame_typedefs").SerializedGame} SerializedGame
 */

export class Savegame extends ReadWriteProxy {
    /**
     *
     * @param {Application} app
     * @param {object} param0
     * @param {string} param0.internalId
     * @param {SavegameMetadata} param0.metaDataRef Handle to the meta data
     */
    constructor(app, { internalId, metaDataRef }) {
        super(app.storage, "savegame-" + internalId + ".bin");

        /** @type {Application} */
        this.app = app;

        this.internalId = internalId;
        this.metaDataRef = metaDataRef;

        /** @type {SavegameData} */
        this.currentData = this.getDefaultData();

        assert(
            savegameInterfaces[Savegame.getCurrentVersion()],
            "Savegame interface not defined: " + Savegame.getCurrentVersion()
        );
    }

    //////// RW Proxy Impl //////////

    /**
     * @returns {number}
     */
    static getCurrentVersion() {
        return 1010;
    }

    /**
     * @returns {typeof BaseSavegameInterface}
     */
    static getReaderClass() {
        return savegameInterfaces[Savegame.getCurrentVersion()];
    }

    /**
     *
     * @param {Application} app
     * @returns
     */
    static createPuzzleSavegame(app) {
        return new Savegame(app, {
            internalId: "puzzle",
            metaDataRef: {
                internalId: "puzzle",
                lastUpdate: 0,
                version: 0,
                level: 0,
                name: "puzzle",
            },
        });
    }

    /**
     * @returns {number}
     */
    getCurrentVersion() {
        return /** @type {typeof Savegame} */ (this.constructor).getCurrentVersion();
    }

    /**
     * Returns the savegames default data
     * @returns {SavegameData}
     */
    getDefaultData() {
        return {
            version: this.getCurrentVersion(),
            dump: null,
            lastUpdate: Date.now(),
            mods: MODS.getModsListForSavegame(),
        };
    }

    /**
     * Migrates the savegames data
     * @param {SavegameData} data
     */
    migrate(data) {
        if (data.version !== this.getCurrentVersion()) {
            return ExplainedResult.bad("Savegame upgrade is not supported");
        }

        return ExplainedResult.good();
    }

    /**
     * Verifies the savegames data
     * @param {SavegameData} data
     */
    verify(data) {
        if (!data.dump) {
            // Well, guess that works
            return ExplainedResult.good();
        }

        if (!this.getDumpReaderForExternalData(data).validate()) {
            return ExplainedResult.bad("dump-reader-failed-validation");
        }
        return ExplainedResult.good();
    }

    //////// Subclasses interface  ////////

    /**
     * Returns if this game can be saved on disc
     * @returns {boolean}
     */
    isSaveable() {
        return true;
    }

    /**
     * Returns the *real* last update of the savegame, not the one of the metadata
     * which could also be the servers one
     */
    getRealLastUpdate() {
        return this.currentData.lastUpdate;
    }

    /**
     * Returns if this game has a serialized game dump
     */
    hasGameDump() {
        return !!this.currentData.dump && this.currentData.dump.entities.length > 0;
    }

    /**
     * Returns the current game dump
     * @returns {SerializedGame}
     */
    getCurrentDump() {
        return this.currentData.dump;
    }

    /**
     * Returns a reader to access the data
     * @returns {BaseSavegameInterface}
     */
    getDumpReader() {
        if (!this.currentData.dump) {
            logger.warn("Getting reader on null-savegame dump");
        }

        const cls = /** @type {typeof Savegame} */ (this.constructor).getReaderClass();
        return new cls(this.currentData);
    }

    /**
     * Returns a reader to access external data
     * @returns {BaseSavegameInterface}
     */
    getDumpReaderForExternalData(data) {
        assert(data.version, "External data contains no version");
        return getSavegameInterface(data);
    }

    ///////// Public Interface ///////////

    /**
     * Updates the last update field so we can send the savegame to the server,
     * WITHOUT Saving!
     */
    setLastUpdate(time) {
        this.currentData.lastUpdate = time;
    }

    /**
     *
     * @param {GameRoot} root
     */
    updateData(root) {
        // Construct a new serializer
        const serializer = new SavegameSerializer();

        // let timer = performance.now();
        const dump = serializer.generateDumpFromGameRoot(root);
        if (!dump) {
            return false;
        }

        const shadowData = {};
        shadowData.dump = dump;
        shadowData.lastUpdate = new Date().getTime();
        shadowData.version = this.getCurrentVersion();
        shadowData.mods = MODS.getModsListForSavegame();

        const reader = this.getDumpReaderForExternalData(shadowData);

        // Validate (not in prod though)
        if (!G_IS_RELEASE) {
            const validationResult = reader.validate();
            if (!validationResult) {
                return false;
            }
        }

        // Save data
        this.currentData = shadowData;
    }

    /**
     * Writes the savegame as well as its metadata
     */
    writeSavegameAndMetadata() {
        return this.writeAsync().then(() => this.saveMetadata());
    }

    /**
     * Updates the savegames metadata
     */
    saveMetadata() {
        this.metaDataRef.lastUpdate = new Date().getTime();
        this.metaDataRef.version = this.getCurrentVersion();
        if (!this.hasGameDump()) {
            this.metaDataRef.level = 0;
        } else {
            this.metaDataRef.level = this.currentData.dump.hubGoals.level;
        }

        return this.app.savegameMgr.writeAsync();
    }

    /**
     * @see ReadWriteProxy.writeAsync
     * @returns {Promise<any>}
     */
    writeAsync() {
        if (G_IS_DEV && globalConfig.debug.disableSavegameWrite) {
            return Promise.resolve();
        }
        return super.writeAsync();
    }
}
