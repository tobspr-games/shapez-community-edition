import { app, protocol } from "electron";
import fs from "node:fs/promises";
import path from "path";
import { switches, userData } from "./config.js";
// We want to be able to have comments for documentation purposes
import { stripComments } from "jsonc-parser"
import { type } from "arktype";

const localPrefix = "@/";
const modFileSuffix = ".asar";

const decoder = new TextDecoder();

type FileNode = {
    name: string;
    isFile: true;
    contents: ArrayBufferLike;
};

type DirectoryNode = {
    name: string;
    isFile: false;
    contents: Record<string, Node>;
};

type Node = FileNode | DirectoryNode;
type ModMetadata = {
    name: string,
    version: string,
    author: string,
    website: string,
    description: string,
    id: string,
    minimumGameVersion?: string,
    settings?: object,
    doesNotAffectSavegame?: boolean,
    entryPoint: string
}
const modMetadata = type({
    name: "string",
    version: "string",
    author: "string",
    website: "string",
    description: "string",
    id: "string",
    minimumGameVersion: "string?",
    settings: "object?",
    doesNotAffectSavegame: "boolean?",
    entryPoint: "string"
})

interface Mod {
    metadata: ModMetadata;
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
            const dirNode = await this.readDirectory(file);
            if (!("mod.json" in dirNode.contents)) {
                console.warn(`${dirNode.name} is being skipped because its mod.json doesn't exist`)
                continue
            }

            if (!(dirNode.contents["mod.json"].isFile)) {
                console.warn(`${dirNode.name} is being skipped because its mod.json isn't a file`)
                continue
            }
            const metadata = modMetadata(JSON.parse(stripComments(
                decoder.decode(dirNode.contents["mod.json"].contents))
            ));
            if (metadata instanceof type.errors) {
                console.warn(`${dirNode.name} is being skipped because it has an invalid mod.json`)
                continue
            }
            allMods.push({
                contents: dirNode,
                metadata: metadata
            })
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
        const contents: Record<string, Node> = {};


        for (const entry of entries) {
            contents[entry.name] = entry.isFile() ? {
                isFile: true,
                name: entry.name,
                contents: (await fs.readFile(path.join(dirPath, entry.name))).buffer
            } : {
                isFile: false,
                name: entry.name,
                contents: (await this.readDirectory(entry.path)).contents,
            }
        }

        return {
            isFile: false,
            name: path.basename(dirPath),
            contents,
        };
    }
}
