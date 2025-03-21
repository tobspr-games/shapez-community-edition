import fs from "fs/promises";
import path from "path";
import { userData } from "./config.js";

interface GenericFsJob {
    filename: string;
}

type ListFsJob = GenericFsJob & { type: "list" };
type ReadFsJob = GenericFsJob & { type: "read" };
type WriteFsJob = GenericFsJob & { type: "write"; contents: string };
type DeleteFsJob = GenericFsJob & { type: "delete" };

export type FsJob = ListFsJob | ReadFsJob | WriteFsJob | DeleteFsJob;
type FsJobResult = string | string[] | void;

export class FsJobHandler {
    readonly rootDir: string;

    constructor(subDir: string) {
        this.rootDir = path.join(userData, subDir);
    }

    handleJob(job: FsJob): Promise<FsJobResult> {
        const filename = this.safeFileName(job.filename);

        switch (job.type) {
            case "list":
                return this.list(filename);
            case "read":
                return this.read(filename);
            case "write":
                return this.write(filename, job.contents);
            case "delete":
                return this.delete(filename);
        }

        // @ts-expect-error this method can actually receive garbage
        throw new Error(`Unknown FS job type: ${job.type}`);
    }

    private list(subdir: string): Promise<string[]> {
        // Bare-bones implementation
        return fs.readdir(subdir);
    }

    private read(file: string): Promise<string> {
        return fs.readFile(file, "utf-8");
    }

    private async write(file: string, contents: string): Promise<string> {
        // Backups not implemented yet.
        await fs.writeFile(file, contents, {
            encoding: "utf-8",
            flush: true,
        });
        return contents;
    }

    private delete(file: string): Promise<void> {
        return fs.unlink(file);
    }

    private safeFileName(name: string) {
        // TODO: Rather than restricting file names, attempt to resolve everything
        // relative to the data directory (i.e. normalize the file path, then join)
        const relative = name.replace(/[^a-z.0-9_-]/gi, "_");
        return path.join(this.rootDir, relative);
    }
}
