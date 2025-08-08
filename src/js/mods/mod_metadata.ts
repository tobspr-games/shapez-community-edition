import { Mod } from "./mod";

export interface ModAuthor {
    name: string;
    website?: string;
}

export interface ModMetadata {
    // format: 1;
    id: string;
    entry: string;
    name: string;
    description?: string;
    authors: ModAuthor[];
    version: string;
    savegameResident: boolean;
    website?: string;
    source?: string;
}

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

export interface FrozenModMetadata extends Readonly<Omit<ModMetadata, "authors">> {
    authors: ReadonlyArray<Readonly<ModAuthor>>;
}
