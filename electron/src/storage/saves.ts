import { encode } from "@msgpack/msgpack";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { StorageInterface } from "./interface.js";

/**
 * This storage implementation is used for savegame files and other
 * ReadWriteProxy objects. It uses gzipped MessagePack as the file format.
 */
export class SavesStorage implements StorageInterface<unknown> {
    async read(file: string): Promise<unknown> {
        return fs.promises.readFile(file);
    }

    async write(file: string, contents: unknown): Promise<void> {
        const stream = fs.createWriteStream(file);
        const gzip = createGzip();

        try {
            const encoded = encode(contents);
            const blob = new Blob([encoded]);

            return await pipeline(blob.stream(), gzip, stream);
        } finally {
            gzip.close();
            stream.close();
        }
    }

    delete(file: string): Promise<void> {
        return fs.promises.unlink(file);
    }
}
