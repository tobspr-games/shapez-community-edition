import { Application } from "@/application";
import { FsError } from "./fs_error";

export const STORAGE_SAVES = "saves";
export const STORAGE_MOD_PREFIX = "mod/";

export class Storage {
    readonly app: Application;
    readonly id: string;

    constructor(app: Application, id: string) {
        this.app = app;
        this.id = id;
    }

    /**
     * Initializes the storage
     */
    initialize(): Promise<void> {
        return this.invokeFsJob({ type: "initialize" });
    }

    /**
     * Writes a string to a file asynchronously
     */
    writeFileAsync(filename: string, contents: unknown): Promise<void> {
        return this.invokeFsJob({ type: "write", filename, contents });
    }

    /**
     * Reads a string asynchronously
     */
    readFileAsync(filename: string): Promise<unknown> {
        return this.invokeFsJob({ type: "read", filename });
    }

    /**
     * Tries to delete a file
     */
    deleteFileAsync(filename: string): Promise<void> {
        return this.invokeFsJob({ type: "delete", filename });
    }

    /**
     * Displays the "Open File" dialog to let user pick a file. Returns the
     * decompressed file contents, or undefined if the operation was canceled
     */
    requestOpenFile(extension: string): Promise<unknown> {
        return this.invokeFsJob({ type: "open-external", extension });
    }

    /**
     * Displays the "Save File" dialog to let user pick a file. If the user
     * picks a file, the passed contents will be compressed and written to
     * that file.
     */
    requestSaveFile(filename: string, contents: unknown): Promise<unknown> {
        return this.invokeFsJob({ type: "save-external", filename, contents });
    }

    private invokeFsJob(data: object) {
        return ipcRenderer
            .invoke("fs-job", {
                id: this.id,
                ...data,
            })
            .catch(e => this.wrapError(e));
    }

    private wrapError(err: unknown): Promise<never> {
        const message = err instanceof Error ? err.message : err.toString();
        return Promise.reject(new FsError(message, { cause: err }));
    }
}
