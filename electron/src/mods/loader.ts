import EventEmitter from "node:events";
import fs from "node:fs/promises";
import path from "node:path";
import { DevelopmentModLocator, DistroModLocator, ModLocator, UserModLocator } from "./locator.js";
import { IpcModMetadata, ModMetadata } from "./metadata.js";

type ModSource = "user" | "distro" | "dev";

interface ModLocation {
    source: ModSource;
    file: string;
}

interface DisabledMod {
    source: ModSource;
    id: string;
}

interface IpcMod extends ModLocation {
    disabled: boolean;
    metadata: IpcModMetadata;
}

const METADATA_FILE = "mod.json";

class Mod {
    readonly source: ModSource;
    readonly file: string;
    readonly metadata: ModMetadata;

    disabled = false;

    constructor(source: ModSource, file: string, metadata: ModMetadata) {
        this.source = source;
        this.file = file;
        this.metadata = metadata;
    }

    toJSON(): IpcMod {
        return {
            source: this.source,
            file: this.file,
            disabled: this.disabled,
            metadata: {
                ...this.metadata,
                version: this.metadata.version.format(),
            },
        };
    }
}

export class ModLoader extends EventEmitter {
    private mods: Mod[] = [];
    private readonly locators = new Map<ModSource, ModLocator>();

    constructor() {
        super();

        this.locators.set("user", new UserModLocator());
        this.locators.set("distro", new DistroModLocator());

        const devLocator = new DevelopmentModLocator();
        this.locators.set("dev", devLocator);

        // If requested, restart automatically when dev mods are modified
        devLocator.fsWatcher?.on("all", this.delayedForceReload());
    }

    /**
     * Resets modloader state and reloads all mods, then triggers page reload.
     */
    async forceReload() {
        await this.loadMods();
        this.emit("forcereload");
    }

    async loadMods(): Promise<void> {
        const mods: Mod[] = [];
        this.mods = mods;

        const locations = await this.locateAllMods();
        for (const location of locations) {
            const metadata = await this.resolveMetadata(location);
            if (metadata === null) {
                continue;
            }

            // TODO: Only check this after applying disabled state
            if (this.isModPresent(metadata.id)) {
                console.warn(`Ignoring duplicate mod ${location.source}::${location.file}`);
                continue;
            }

            mods.push(new Mod(location.source, location.file, metadata));
        }

        // Check for mods that should be disabled
        for (const { source, id } of await this.collectDisabledMods()) {
            const target = mods.find(m => m.source === source && m.metadata.id === id);
            if (target !== undefined) {
                target.disabled = true;
            }
        }
    }

    getAllMods(): IpcMod[] {
        return this.mods.map(mod => mod.toJSON());
    }

    isModPresent(id: string): boolean {
        return this.mods.some(mod => mod.metadata.id === id);
    }

    getModById(id: string): Mod | undefined {
        return this.mods.find(mod => mod.metadata.id === id);
    }

    private delayedForceReload() {
        // Debounce the force reload manually as chokidar won't aggregate events the way we want
        // NOTE: The delay chosen here (250ms) is quite arbitrary!
        let timeout: NodeJS.Timeout | undefined = undefined;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => this.forceReload(), 250);
        };
    }

    private async locateAllMods(): Promise<ModLocation[]> {
        // Sort locators by priority, lowest number is highest priority
        const locators = [...this.locators.entries()].sort(([, a], [, b]) => a.priority - b.priority);
        const result: ModLocation[] = [];

        for (const [source, locator] of locators) {
            for (const file of await locator.locateMods()) {
                result.push({ source, file });
            }
        }

        return result;
    }

    private async resolveMetadata(mod: ModLocation): Promise<ModMetadata | null> {
        // TODO: This function might call validation routines
        const filePath = path.join(mod.file, METADATA_FILE);
        try {
            const contents = await fs.readFile(filePath, "utf-8");
            return ModMetadata.parse(JSON.parse(contents));
        } catch (err) {
            // TODO: Collect mod errors, show to the user once all mods are loaded
            console.error("Failed to read mod metadata", err);
            return null;
        }
    }

    private async collectDisabledMods(): Promise<DisabledMod[]> {
        const result: DisabledMod[] = [];

        for (const [source, locator] of this.locators.entries()) {
            for (const id of await locator.getDisabledMods()) {
                result.push({ source, id });
            }
        }

        return result;
    }
}
