import { Application } from "@/application";
import { Compression, DefaultCompression } from "@/core/compression";
import { FsError } from "./fs_error";

export const STORAGE_SAVES = "saves";
export const STORAGE_MOD_PREFIX = "mod/";

interface FsJob {
    type: string;
    filename?: string;
    contents?: Uint8Array;
    extension?: string;
}

export class Storage {
    readonly app: Application;
    readonly id: string;
    readonly compression: Compression;

    constructor(app: Application, id: string, compression?: Compression) {
        this.app = app;
        this.id = id;
        this.compression = compression ?? new DefaultCompression();
    }

    /**
     * Initializes the storage
     */
    initialize(): Promise<void> {
        return this.invokeFsJob({ type: "initialize" });
    }

    /**
     * Reads a string asynchronously
     */
    readFileAsync(filename: string): Promise<unknown> {
        return this.invokeFsJob({ type: "read", filename }).then(contents =>
            this.compression.decompress(contents)
        );
    }

    /**
     * Writes a string to a file asynchronously
     */
    writeFileAsync(filename: string, contents: unknown): Promise<void> {
        return this.compression
            .compress(contents)
            .then(contents => this.invokeFsJob({ type: "write", filename, contents }));
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
        return this.invokeFsJob({ type: "open-external", extension }).then(contents =>
            contents ? this.compression.decompress(contents) : undefined
        );
    }

    /**
     * Displays the "Save File" dialog to let user pick a file. If the user
     * picks a file, the passed contents will be compressed and written to
     * that file.
     */
    requestSaveFile(filename: string, contents: unknown): Promise<unknown> {
        return this.compression
            .compress(contents)
            .then(contents => this.invokeFsJob({ type: "save-external", filename, contents }));
    }

    private invokeFsJob(data: FsJob) {
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
