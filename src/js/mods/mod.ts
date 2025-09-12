import { Application } from "@/application";
import { ModInterfaceV2 } from "./mod_interface_v2";
import { FrozenModMetadata, ModMetadata } from "./mod_metadata";
import { MOD_SIGNALS } from "./mod_signals";
import { ModLoader } from "./modloader";

export type ModConstructor = new (metadata: ModMetadata, app: Application, modLoader: ModLoader) => Mod;

function freezeMetadata(metadata: ModMetadata): FrozenModMetadata {
    // Note: Object.freeze doesn't create a copy of the object
    for (const author of metadata.authors) {
        Object.freeze(author);
    }

    Object.freeze(metadata.authors);

    if (metadata.format !== 1) {
        for (const dependency of metadata.dependencies) {
            Object.freeze(dependency);
        }

        Object.freeze(metadata.dependencies);
    }

    return Object.freeze(metadata);
}

export abstract class Mod {
    // TODO: Review what properties are necessary while improving ModInterface
    protected readonly app: Application;
    protected readonly modLoader: ModLoader;
    protected readonly modInterface: ModInterfaceV2;
    protected readonly signals = MOD_SIGNALS;

    // Exposed for convenience
    readonly id: string;
    readonly metadata: FrozenModMetadata;
    readonly errors: Error[] = [];

    constructor(metadata: ModMetadata, app: Application, modLoader: ModLoader) {
        this.app = app;
        this.modLoader = modLoader;

        this.id = metadata.id;
        this.metadata = freezeMetadata(metadata);

        // ModInterfaceV2 assumes id to be set
        this.modInterface = new ModInterfaceV2(this, modLoader);
    }

    abstract init(): void | Promise<void>;

    get dialogs() {
        return this.modInterface.dialogs;
    }
}
