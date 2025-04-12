import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { executableDir, userData } from "../config.js";

export const MOD_FILE_SUFFIX = ".asar";

const DISABLED_MODS_FILE = "disabled-mods.json";
const USER_MODS_DIR = path.join(userData, "mods");
const DISTRO_MODS_DIR = path.join(executableDir, "mods");

const DEV_SWITCH = "load-mod";
const DEV_USER_MOD_PREFIX = "@/";

export interface ModLocator {
    readonly priority: number;

    /**
     * Asynchronously look for mod candidates.
     *
     * @returns absolute file paths of located mods
     */
    locateMods(): Promise<string[]>;

    /**
     * Mark or unmark the specified mod as disabled.
     *
     * @param id ID of the mod to disable or enable
     * @param flag whether to disable the mod
     */
    setModDisabled(id: string, flag: boolean): Promise<void>;

    /**
     * Retrieve the list of mod IDs that should not be loaded.
     *
     * @returns IDs of the disabled mods
     */
    getDisabledMods(): Promise<string[]>;
}

abstract class DirectoryModLocator implements ModLocator {
    abstract readonly priority: number;

    protected readonly directory: string;
    private readonly disabledModsFile: string;
    private disabledMods: Set<string> | null = null;

    constructor(directory: string) {
        this.directory = directory;
        this.disabledModsFile = path.join(directory, DISABLED_MODS_FILE);
    }

    async locateMods(): Promise<string[]> {
        try {
            const dir = await fs.readdir(this.directory, { withFileTypes: true });
            return dir
                .filter(entry => entry.name.endsWith(MOD_FILE_SUFFIX))
                .map(entry => path.join(entry.path, entry.name));
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                // The directory does not exist
                return [];
            }

            // Propagate all other errors
            throw err;
        }
    }

    setModDisabled(id: string, flag: boolean): Promise<void> {
        // Note: it is assumed that calling this before accessing
        // getDisabledMods will overwrite the file.
        this.disabledMods ??= new Set();

        if (flag) {
            this.disabledMods.add(id);
        } else {
            this.disabledMods.delete(id);
        }

        return this.writeDisabledModsFile();
    }

    async getDisabledMods(): Promise<string[]> {
        if (this.disabledMods === null) {
            await this.readDisabledModsFile();
        }

        return [...this.disabledMods!];
    }

    private async readDisabledModsFile(): Promise<void> {
        // TODO: Validate internal structure (once something is added for
        // mod metadata file validation)

        try {
            const contents = await fs.readFile(this.disabledModsFile, "utf-8");
            this.disabledMods = new Set(JSON.parse(contents));
        } catch (err) {
            // Ensure we don't fail twice
            this.disabledMods ??= new Set();

            if ((err as NodeJS.ErrnoException).code == "ENOENT") {
                // Ignore error entirely if the file is missing
                return;
            }

            if (err instanceof SyntaxError) {
                // Malformed JSON, replace the file
                return this.writeDisabledModsFile();
            }

            console.warn(`Reading ${this.disabledModsFile} failed:`, err);
        }
    }

    private async writeDisabledModsFile(): Promise<void> {
        try {
            const contents = JSON.stringify([...(this.disabledMods ?? new Set())]);
            await fs.writeFile(this.disabledModsFile, contents, "utf-8");
        } catch (err: unknown) {
            // Nothing we can do
            console.warn(`Writing ${this.disabledModsFile} failed:`, err);
        }
    }
}

export class UserModLocator extends DirectoryModLocator {
    readonly priority = 1;

    constructor() {
        super(USER_MODS_DIR);
    }

    async locateMods(): Promise<string[]> {
        // Ensure the directory exists
        await fs.mkdir(this.directory, { recursive: true });
        return super.locateMods();
    }
}

export class DistroModLocator extends DirectoryModLocator {
    readonly priority = 2;

    constructor() {
        super(DISTRO_MODS_DIR);
    }
}

export class DevelopmentModLocator implements ModLocator {
    readonly priority = 0;

    private readonly modFiles: string[] = [];
    private readonly disabledMods = new Set<string>();

    constructor() {
        const switchValue = app.commandLine.getSwitchValue(DEV_SWITCH);
        if (switchValue === "") {
            // Empty string = switch not passed
            return;
        }

        const resolved = switchValue.split(",").map(f => this.resolveFile(f));
        this.modFiles.push(...resolved);
    }

    locateMods(): Promise<string[]> {
        return Promise.resolve(this.modFiles);
    }

    setModDisabled(id: string, flag: boolean): Promise<void> {
        if (flag) {
            this.disabledMods.add(id);
        } else {
            this.disabledMods.delete(id);
        }

        return Promise.resolve();
    }

    getDisabledMods(): Promise<string[]> {
        return Promise.resolve([...this.disabledMods]);
    }

    private resolveFile(file: string) {
        // Allow using @/*.asar to reference user mods directory
        if (file.startsWith(DEV_USER_MOD_PREFIX)) {
            file = file.slice(DEV_USER_MOD_PREFIX.length);
            return path.join(USER_MODS_DIR, file);
        }

        // Resolve mods relative to CWD, useful for development
        return path.resolve(file);
    }
}
