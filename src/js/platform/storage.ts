/* typehints:start */
import { Application } from "../application";
/* typehints:end */

export const FILE_NOT_FOUND = "file_not_found";

export class Storage {
    constructor(app) {
        /** @type {Application} */
        this.app = app;
    }

    /**
     * Initializes the storage
     * @returns {Promise<void>}
     */
    initialize() {
        return Promise.resolve();
    }

    /**
     * Writes a string to a file asynchronously
     * @param {string} filename
     * @param {string} contents
     * @returns {Promise<void>}
     */
    writeFileAsync(filename, contents) {
        return ipcRenderer.invoke("fs-job", {
            type: "write",
            filename,
            contents,
        });
    }

    /**
     * Reads a string asynchronously. Returns Promise<FILE_NOT_FOUND> if file was not found.
     * @param {string} filename
     * @returns {Promise<string>}
     */
    readFileAsync(filename) {
        return ipcRenderer
            .invoke("fs-job", {
                type: "read",
                filename,
            })
            .then(res => {
                if (res && res.error === FILE_NOT_FOUND) {
                    throw FILE_NOT_FOUND;
                }

                return res;
            });
    }

    /**
     * Tries to delete a file
     * @param {string} filename
     * @returns {Promise<void>}
     */
    deleteFileAsync(filename) {
        return ipcRenderer.invoke("fs-job", {
            type: "delete",
            filename,
        });
    }
}
