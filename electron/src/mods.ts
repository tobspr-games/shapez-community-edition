import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import { switches, userData } from "./config.js";

const localPrefix = "@/";
const modFileSuffix = ".js";

interface Mod {
    file: string;
    source: string;
}

export class ModsHandler {
    private mods: Mod[] = [];
    readonly modsDir = path.join(userData, "mods");

    async getMods(): Promise<Mod[]> {
        return this.mods;
    }

    async reload() {
        // Ensure the directory exists!
        fs.mkdir(this.modsDir, { recursive: true });

        // Note: this method is written with classic .js mods in mind
        const files = await this.getModPaths();
        const allMods: Mod[] = [];

        for (const file of files) {
            const source = await fs.readFile(file, "utf-8");
            allMods.push({ file, source });
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
            .filter(entry => !entry.isDirectory())
            .map(entry => path.join(entry.path, entry.name));
    }
}
