import { app, protocol } from "electron";
import fs from "node:fs/promises";
import path from "path";
import { switches, userData } from "./config.js";
// We want to be able to have comments for documentation purposes
import { stripComments } from "jsonc-parser"
import { type } from "arktype";
import { contentType, lookup, charset } from "mime-types"

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
    contents: Record<string, Node>;
};

type Node = FileNode | DirectoryNode;
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
    metadata: typeof modMetadata.infer;
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
        protocol.handle(this.modScheme, this.protocolHandler.bind(this));
    }

    private async protocolHandler(req: Request): Promise<Response> {
        if (req.method !== "GET") {
            return new Response(null, { status: 405 })
        }
        const url = new URL(req.url);
        const pathnames = url.pathname.split("/").slice(1);
        console.log(url.hostname, pathnames)

        if (pathnames.length < 1) {
            return new Response(null, { status: 400 })
        }

        for (const mod of this.mods) {
            if (url.hostname == mod.metadata.id) {
                let node: Node = mod.contents
                try {
                    for (const path of pathnames) {
                        if (!(path in node.contents)) {
                            return new Response(null, { status: 404 });
                        }
                        node = node.contents[path];
                    }
                } catch {
                    return new Response(null, { status: 500 });
                }
                if (!node.isFile) {
                    return new Response(null, { status: 500 });
                }
                const fileCharSet = charset(node.name)
                if (!fileCharSet) {
                    return new Response(node.contents, {
                        headers: {
                            "Content-Type": contentType(node.name)
                        }
                    })
                }
                const decoder = new TextDecoder(fileCharSet);
                return new Response(decoder.decode(node.contents), {
                    headers: {
                        "Content-Type": contentType(node.name)
                    }
                })
            }
        }
        return new Response(null, { status: 404 });
    }

    async reload() {
        const decoder = new TextDecoder();
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
