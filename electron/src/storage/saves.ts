import { decodeAsync, encode } from "@msgpack/msgpack";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";
import { StorageInterface } from "./interface.js";

/**
 * This storage implementation is used for savegame files and other
 * ReadWriteProxy objects. It uses gzipped MessagePack as the file format.
 */
export class SavesStorage implements StorageInterface<unknown> {
    async read(file: string): Promise<unknown> {
        const stream = fs.createReadStream(file);
        const gunzip = createGunzip();

        try {
            // Any filesystem errors will be uncovered here. This code ensures we return the most
            // relevant rejection, or resolve with the decoded data
            const [readResult, decodeResult] = await Promise.allSettled([
                pipeline(stream, gunzip),
                decodeAsync(gunzip),
            ]);

            if (decodeResult.status === "fulfilled") {
                return decodeResult.value;
            }

            // Return the most relevant error
            throw readResult.status === "rejected" ? readResult.reason : decodeResult.reason;
        } finally {
            stream.close();
            gunzip.close();
        }
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
