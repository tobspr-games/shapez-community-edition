/* typehints:start */
import { Storage } from "@/platform/storage";
/* typehints:end */

import { FsError } from "@/platform/fs_error";
import { ExplainedResult } from "./explained_result";
import { createLogger } from "./logging";

import debounce from "debounce-promise";

const logger = createLogger("read_write_proxy");

// Helper which only writes / reads if verify() works. Also performs migration
export class ReadWriteProxy {
    constructor(storage, filename) {
        /** @type {Storage} */
        this.storage = storage;

        this.filename = filename;

        /** @type {object} */
        this.currentData = null;

        // TODO: EXTREMELY HACKY! To verify we need to do this a step later
        if (G_IS_DEV) {
            setTimeout(() => {
                assert(
                    this.verify(this.getDefaultData()).result,
                    "Verify() failed for default data: " + this.verify(this.getDefaultData()).reason
                );
            });
        }

        /**
         * Store a debounced handler to prevent double writes
         */
        this.debouncedWrite = debounce(this.doWriteAsync.bind(this), 50);
    }

    // -- Methods to override

    /** @returns {ExplainedResult} */
    verify(data) {
        abstract;
        return ExplainedResult.bad();
    }

    // Should return the default data
    getDefaultData() {
        abstract;
        return {};
    }

    // Should return the current version as an integer
    getCurrentVersion() {
        abstract;
        return 0;
    }

    // Should migrate the data (Modify in place)
    /** @returns {ExplainedResult} */
    migrate(data) {
        abstract;
        return ExplainedResult.bad();
    }

    // -- / Methods

    // Resets whole data, returns promise
    resetEverythingAsync() {
        logger.warn("Reset data to default");
        this.currentData = this.getDefaultData();
        return this.writeAsync();
    }

    /**
     *
     * @param {object} obj
     */
    static serializeObject(obj) {
        // TODO: Remove redundant method
        return obj;
    }

    /**
     *
     * @param {object} text
     */
    static deserializeObject(text) {
        // TODO: Remove redundant method
        return text;
    }

    /**
     * Writes the data asychronously, fails if verify() fails.
     * Debounces the operation by up to 50ms
     * @returns {Promise<void>}
     */
    writeAsync() {
        const verifyResult = this.internalVerifyEntry(this.currentData);

        if (!verifyResult.result) {
            logger.error("Tried to write invalid data to", this.filename, "reason:", verifyResult.reason);
            return Promise.reject(verifyResult.reason);
        }

        return this.debouncedWrite();
    }

    /**
     * Actually writes the data asychronously
     * @returns {Promise<void>}
     */
    doWriteAsync() {
        return this.storage
            .writeFileAsync(this.filename, this.currentData)
            .then(() => {
                logger.log("📄 Wrote", this.filename);
            })
            .catch(err => {
                logger.error("Failed to write", this.filename, ":", err);
                throw err;
            });
    }

    // Reads the data asynchronously, fails if verify() fails
    readAsync() {
        // Start read request
        return (
            this.storage
                .readFileAsync(this.filename)

                // Check for errors during read
                .catch(err => {
                    if (err instanceof FsError && err.isFileNotFound()) {
                        logger.log("File not found, using default data");

                        // File not found or unreadable, assume default file
                        return Promise.resolve(this.getDefaultData());
                    }

                    return Promise.reject("file-error: " + err);
                })

                // Verify basic structure
                .then(contents => {
                    const result = this.internalVerifyBasicStructure(contents);
                    if (!result.isGood()) {
                        return Promise.reject("verify-failed: " + result.reason);
                    }
                    return contents;
                })

                // Check version and migrate if required
                .then(contents => {
                    if (contents.version > this.getCurrentVersion()) {
                        return Promise.reject("stored-data-is-newer");
                    }

                    if (contents.version < this.getCurrentVersion()) {
                        logger.log(
                            "Trying to migrate data object from version",
                            contents.version,
                            "to",
                            this.getCurrentVersion()
                        );
                        const migrationResult = this.migrate(contents); // modify in place
                        if (migrationResult.isBad()) {
                            return Promise.reject("migration-failed: " + migrationResult.reason);
                        }
                    }
                    return contents;
                })

                // Verify
                .then(contents => {
                    const verifyResult = this.internalVerifyEntry(contents);
                    if (!verifyResult.result) {
                        logger.error(
                            "Read invalid data from",
                            this.filename,
                            "reason:",
                            verifyResult.reason,
                            "contents:",
                            contents
                        );
                        return Promise.reject("invalid-data: " + verifyResult.reason);
                    }
                    return contents;
                })

                // Store
                .then(contents => {
                    this.currentData = contents;
                    logger.log("📄 Read data with version", this.currentData.version, "from", this.filename);
                    return contents;
                })

                // Catchall
                .catch(err => {
                    return Promise.reject("Failed to read " + this.filename + ": " + err);
                })
        );
    }

    /**
     * Deletes the file
     * @returns {Promise<void>}
     */
    deleteAsync() {
        return this.storage.deleteFileAsync(this.filename);
    }

    // Internal

    /** @returns {ExplainedResult} */
    internalVerifyBasicStructure(data) {
        if (!data) {
            return ExplainedResult.bad("Data is empty");
        }
        if (!Number.isInteger(data.version) || data.version < 0) {
            return ExplainedResult.bad(
                `Data has invalid version: ${data.version} (expected ${this.getCurrentVersion()})`
            );
        }

        return ExplainedResult.good();
    }

    /** @returns {ExplainedResult} */
    internalVerifyEntry(data) {
        if (data.version !== this.getCurrentVersion()) {
            return ExplainedResult.bad(
                "Version mismatch, got " + data.version + " and expected " + this.getCurrentVersion()
            );
        }

        const verifyStructureError = this.internalVerifyBasicStructure(data);
        if (!verifyStructureError.isGood()) {
            return verifyStructureError;
        }
        return this.verify(data);
    }
}
