import { app, protocol } from "electron";
import fs from "node:fs/promises";
import path from "path";
import { switches, userData } from "./config.js";
import type { Dirent } from "fs";

const localPrefix = "@/";
const modFileSuffix = ".asar";

type FileNode = {
    name: string;
    isFile: true;
    contents: ArrayBufferLike;
};

type DirectoryNode = {
    name: string;
    isFile: false;
    contents: Node[];
};

type Node = FileNode | DirectoryNode;

// type ModMetadata = {
//    name: string;
//    version: string;
//    author: string;
//    website: string;
//    description: string;
//    id: string;
//    minimumGameVersion?: string;
//    settings: [];
//    doesNotAffectSavegame?: boolean
// }

interface Mod {
    // metadata: ModMetadata;
    contents: DirectoryNode;
}

export class ModsHandler {
    private mods: Mod[] = [];
    readonly modsDir = path.join(userData, "mods");
    readonly modScheme = "mod";

    constructor() {
        // Docs say this must be called before the ready event
        protocol.registerSchemesAsPrivileged([
            {
                scheme: this.modScheme,
                privileges: {
                    bypassCSP: true,
                    supportFetchAPI: true,
                    allowServiceWorkers: true
                }
            },
        ]);
    }

    async getMods(): Promise<Mod[]> {
        return this.mods;
    }

    installProtocol() {
        protocol.handle(this.modScheme, this.protocolHandler);
    }

    private async protocolHandler(req: Request): Promise<Response> {
        const url = new URL(req.url);
        url.search

        return new Response();
    }

    async reload() {
        // Ensure the directory exists!
        fs.mkdir(this.modsDir, { recursive: true });

        const files = await this.getModPaths();
        const allMods: Mod[] = [];

        for (const file of files) {
            allMods.push({ contents: await this.readDirectory(file) });
        }

        this.mods = allMods;
    }

    private async getModPaths(): Promise<string[]> {
        const mods: string[] = switches.safeMode ? [] : await this.findModFiles();

        // Note: old switch name, extend support later
        const cmdLine = app.commandLine.getSwitchValue("load-mod");
        const explicitMods = cmdLine === "" ? [] : cmdLine.split(",");

        mods.push(...explicitMods.map(mod => this.resolveModLocation(mod)));

        return [...mods];
    }

    private resolveModLocation(mod: string) {
        if (mod.startsWith(localPrefix)) {
            // Let users specify --safe-mode and easily load only some mods
            const name = mod.slice(localPrefix.length);
            return path.join(this.modsDir, name);
        }

        // Note: here, it's a good idea NOT to resolve mod paths
        // from mods directory, as that can make development easier:
        //
        // $ shapez --load-mod=mymod.js # resolved as $PWD/mymod.js
        return path.resolve(mod);
    }

    private async findModFiles(): Promise<string[]> {
        const directory = await fs.readdir(this.modsDir, {
            withFileTypes: true,
        });

        return directory
            .filter(entry => entry.name.endsWith(modFileSuffix))
            .map(entry => path.join(entry.path, entry.name));
    }

    private async readDirectory(dirPath: string): Promise<DirectoryNode> {
        const entries = await fs.readdir(dirPath, {
            withFileTypes: true,
        });
        const contents: Node[] = [];

        for (const entry of entries) {
            if (entry.isFile) {
                contents.push({
                    isFile: true,
                    name: entry.name,
                    contents: (await fs.readFile(path.join(dirPath, entry.name))).buffer
                });
            } else {
                contents.push({
                    isFile: false,
                    name: entry.name,
                    contents: (await this.readDirectory(entry.path)).contents,
                });
            }
        }

        return {
            isFile: false,
            name: path.basename(dirPath),
            contents,
        };
    }
}
