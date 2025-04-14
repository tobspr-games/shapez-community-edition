import { BrowserWindow, dialog, FileFilter } from "electron";
import fs from "fs/promises";
import path from "path";
import { userData } from "./config.js";
import { StorageInterface } from "./storage/interface.js";

interface GenericFsJob {
    id: string;
}

export type InitializeFsJob = GenericFsJob & { type: "initialize" };
type ListFsJob = GenericFsJob & { type: "list"; filename: string };
type ReadFsJob = GenericFsJob & { type: "read"; filename: string };
type WriteFsJob<T> = GenericFsJob & { type: "write"; filename: string; contents: T };
type DeleteFsJob = GenericFsJob & { type: "delete"; filename: string };

type OpenExternalFsJob = GenericFsJob & { type: "open-external"; extension: string };
type SaveExternalFsJob<T> = GenericFsJob & { type: "save-external"; filename: string; contents: T };

export type FsJob<T> =
    | InitializeFsJob
    | ListFsJob
    | ReadFsJob
    | WriteFsJob<T>
    | DeleteFsJob
    | OpenExternalFsJob
    | SaveExternalFsJob<T>;
type FsJobResult<T> = T | string[] | void;

export class FsJobHandler<T> {
    readonly rootDir: string;
    private readonly storage: StorageInterface<T>;
    private initialized = false;

    constructor(subDir: string, storage: StorageInterface<T>) {
        this.rootDir = path.join(userData, subDir);
        this.storage = storage;
    }

    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Create the directory so that users know where to put files
        await fs.mkdir(this.rootDir, { recursive: true });
        this.initialized = true;
    }

    handleJob(job: FsJob<T>): Promise<FsJobResult<T>> {
        switch (job.type) {
            case "initialize":
                return this.initialize();
            case "open-external":
                return this.openExternal(job.extension);
            case "save-external":
                return this.saveExternal(job.filename, job.contents);
        }

        const filename = this.safeFileName(job.filename);

        switch (job.type) {
            case "list":
                return this.list(filename);
            case "read":
                return this.storage.read(filename);
            case "write":
                return this.write(filename, job.contents);
            case "delete":
                return this.storage.delete(filename);
        }

        // @ts-expect-error this method can actually receive garbage
        throw new Error(`Unknown FS job type: ${job.type}`);
    }

    private async openExternal(extension: string): Promise<T | undefined> {
        const filters = this.getFileDialogFilters(extension === "*" ? undefined : extension);
        const window = BrowserWindow.getAllWindows()[0]!;

        const result = await dialog.showOpenDialog(window, { filters, properties: ["openFile"] });
        if (result.canceled) {
            return undefined;
        }

        return await this.storage.read(result.filePaths[0]);
    }

    private async saveExternal(filename: string, contents: T): Promise<void> {
        // Try to guess extension
        const ext = filename.indexOf(".") < 1 ? filename.split(".").at(-1)! : undefined;
        const filters = this.getFileDialogFilters(ext);
        const window = BrowserWindow.getAllWindows()[0]!;

        const result = await dialog.showSaveDialog(window, { defaultPath: filename, filters });
        if (result.canceled) {
            return;
        }

        return await this.storage.write(result.filePath, contents);
    }

    private getFileDialogFilters(extension?: string): FileFilter[] {
        const filters: FileFilter[] = [{ name: "All files", extensions: ["*"] }];

        if (extension !== undefined) {
            filters.unshift({
                name: `${extension.toUpperCase()} files`,
                extensions: [extension],
            });
        }

        return filters;
    }

    private list(subdir: string): Promise<string[]> {
        // Bare-bones implementation
        return fs.readdir(subdir);
    }

    private async write(file: string, contents: T): Promise<void> {
        // The target directory might not exist, ensure it does
        const parentDir = path.dirname(file);
        await fs.mkdir(parentDir, { recursive: true });

        await this.storage.write(file, contents);
    }

    private safeFileName(name: string) {
        // TODO: Rather than restricting file names, attempt to resolve everything
        // relative to the data directory (i.e. normalize the file path, then join)
        const relative = name.replace(/[^a-z.0-9_-]/gi, "_");
        return path.join(this.rootDir, relative);
    }
}
