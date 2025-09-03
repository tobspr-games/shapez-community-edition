import { Mod } from "./mod";

export interface ModAuthor {
    name: string;
    website?: string;
}

export interface ModDependency {
    id: string;
    version: string;
    optional: boolean;
    loadOrder: "before" | "after";
}

type ModMetadataV1 = {
    format: 1;
    id: string;
    entry: string;
    name: string;
    description?: string;
    authors: ModAuthor[];
    version: string;
    savegameResident: boolean;
    website?: string;
    source?: string;
};

type ModMetadataV2 = {
    format: 2;
    dependencies: ModDependency[];
    loadOrder: "beforeAll" | "afterAll";
} & Omit<ModMetadataV1, "format">;

export type ModMetadata = ModMetadataV1 | ModMetadataV2;

export type ModSource = "user" | "distro" | "dev";

export interface ModQueueEntry {
    source: ModSource;
    file: string;
    disabled: boolean;
    metadata: ModMetadata;
}

export interface ModInfo {
    source: ModSource;
    file: string;
    mod: Mod;
}

export interface FrozenModMetadata extends Readonly<Omit<ModMetadata, "authors" | "dependencies">> {
    authors: ReadonlyArray<Readonly<ModAuthor>>;
    dependencies: ReadonlyArray<Readonly<ModDependency>>;
}
