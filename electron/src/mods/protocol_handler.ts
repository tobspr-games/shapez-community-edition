import { net, protocol } from "electron";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ModLoader } from "./loader.js";

export const MOD_SCHEME = "mod";

export class ModProtocolHandler {
    private modLoader: ModLoader;

    constructor(modLoader: ModLoader) {
        this.modLoader = modLoader;

        protocol.registerSchemesAsPrivileged([
            {
                scheme: MOD_SCHEME,
                privileges: {
                    allowServiceWorkers: true,
                    bypassCSP: true,
                    secure: true,
                    standard: true,
                    stream: true,
                    supportFetchAPI: true,
                },
            },
        ]);
    }

    install() {
        protocol.handle(MOD_SCHEME, this.handler.bind(this));
    }

    private async handler(request: GlobalRequest): Promise<GlobalResponse> {
        const fileUrl = this.getFileUrlForRequest(request);
        if (fileUrl === undefined) {
            return Response.error();
        }

        try {
            return await net.fetch(fileUrl.toString());
        } catch (err) {
            // Check if this is a directory request
            const directoryIndex = await this.getDirectoryIndex(fileUrl);
            if (directoryIndex !== null) {
                return directoryIndex;
            }

            console.error("Failed to fetch:", err);
            return Response.error();
        }
    }

    private async getDirectoryIndex(fileUrl: URL): Promise<GlobalResponse | null> {
        if (!fileUrl.pathname.endsWith("/")) {
            return null;
        }

        // Remove the trailing slash
        fileUrl.pathname = fileUrl.pathname.slice(0, -1);

        try {
            const stats = await lstat(fileUrl);
            if (!stats.isDirectory()) {
                return null;
            }

            const dir = await readdir(fileUrl, { withFileTypes: true });
            const result = dir.map(entry => entry.name + (entry.isDirectory() ? "/" : ""));

            return Response.json(result);
        } catch (err) {
            console.error("Failed to get directory index:", err);
            return null;
        }
    }

    private getFileUrlForRequest(request: GlobalRequest): URL | undefined {
        // mod://mod-id/path/to/file
        const modUrl = new URL(request.url);
        const mod = this.modLoader.getModById(modUrl.hostname);
        if (mod === undefined) {
            return undefined;
        }

        const bundle = mod.file;
        const filePath = path.join(bundle, modUrl.pathname);

        // Check if the path escapes the bundle as per Electron example
        // NOTE: this means file names cannot start with ..
        const relative = path.relative(bundle, filePath);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            return undefined;
        }

        return pathToFileURL(filePath);
    }
}
