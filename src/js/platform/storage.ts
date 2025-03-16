import { Application } from "@/application";
import { FsError } from "./fs_error";

export class Storage {
    readonly app: Application;

    constructor(app: Application) {
        this.app = app;
    }

    /**
     * Initializes the storage
     */
    initialize(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Writes a string to a file asynchronously
     */
    writeFileAsync(filename: string, contents: string): Promise<void> {
        return ipcRenderer
            .invoke("fs-job", {
                type: "write",
                filename,
                contents,
            })
            .catch(e => this.wrapError(e));
    }

    /**
     * Reads a string asynchronously
     */
    readFileAsync(filename: string): Promise<string> {
        return ipcRenderer
            .invoke("fs-job", {
                type: "read",
                filename,
            })
            .catch(e => this.wrapError(e));
    }

    /**
     * Tries to delete a file
     */
    deleteFileAsync(filename: string): Promise<void> {
        return ipcRenderer
            .invoke("fs-job", {
                type: "delete",
                filename,
            })
            .catch(e => this.wrapError(e));
    }

    private wrapError(err: unknown): Promise<never> {
        const message = err instanceof Error ? err.message : err.toString();
        return Promise.reject(new FsError(message, { cause: err }));
    }
}
