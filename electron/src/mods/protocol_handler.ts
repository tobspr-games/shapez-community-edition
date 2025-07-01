import { net, protocol } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { lstat, readdir } from "node:fs/promises";
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
        try {
            const url = new URL(request.url);
            const fileUrl = this.getFileUrlForRequest(request);
            if (fileUrl === undefined) {
                return Response.error();
            }
            if ((await lstat(new URL(fileUrl))).isDirectory()) {
                const contents = await readdir(new URL(fileUrl))
                return Response.json(contents.map(name => path.join(url.pathname, name)))
            }
            else {
                return await net.fetch(fileUrl);
            }
        } catch (err) {
            console.error("Failed to fetch:", err);
            return Response.error();
        }
    }

    private getFileUrlForRequest(request: GlobalRequest): string | undefined {
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
        if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
            return undefined;
        }

        return pathToFileURL(filePath).toString();
    }
}
