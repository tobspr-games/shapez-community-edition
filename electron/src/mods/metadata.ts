import { ModMetadata as ModMetadataV1 } from "./metadata/v1_format.js";
import { ModMetadata as ModMetadataV2 } from "./metadata/v2_format.js";
import { z } from "zod";

// TBD: icons, readme
export const ModMetadata = z.discriminatedUnion("format", [ModMetadataV1, ModMetadataV2]);

export type ModMetadata = z.infer<typeof ModMetadata>;
export type IpcModMetadata = Omit<ModMetadata, "version"> & {
    version: string;
};
