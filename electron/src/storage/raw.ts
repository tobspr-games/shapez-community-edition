import fs from "node:fs/promises";
import { StorageInterface } from "./interface.js";

export class RawStorage implements StorageInterface<string> {
    read(file: string): Promise<string> {
        return fs.readFile(file, "utf-8");
    }

    write(file: string, contents: string): Promise<void> {
        return fs.writeFile(file, contents, "utf-8");
    }

    delete(file: string): Promise<void> {
        return fs.unlink(file);
    }
}
