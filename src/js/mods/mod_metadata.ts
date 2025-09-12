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

type DeepReadonly<T> = Readonly<{
    [K in keyof T]:
    // Is it a primitive? Then make it readonly
    T[K] extends (number | string | symbol | boolean) ? Readonly<T[K]>
    // Is it an array of items? Then make the array readonly and the item as well
    : T[K] extends Array<infer A> ? ReadonlyArray<DeepReadonly<A>>
    // It is some other object, make it readonly as well
    : DeepReadonly<T[K]>;
}>


export type FrozenModMetadata = DeepReadonly<ModMetadata>
