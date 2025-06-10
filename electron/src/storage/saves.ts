import { readFile, writeFile, unlink } from "node:fs/promises";
import { StorageInterface } from "./interface.js";

/**
 * This storage implementation is used for savegame files and other
 * ReadWriteProxy objects. It uses gzipped MessagePack as the file format.
 */
export class SavesStorage implements StorageInterface<unknown> {
    async read(file: string): Promise<unknown> {
        return readFile(file);
    }

    async write(file: string, contents: Uint8Array): Promise<void> {
        return writeFile(file, contents);
    }

    delete(file: string): Promise<void> {
        return unlink(file);
    }
}
