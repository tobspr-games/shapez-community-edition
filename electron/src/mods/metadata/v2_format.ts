import { semverRange, ModID } from "./common.js";
import { ModMetadata as ModMetadataV1 } from "./v1_format.js";
import { z } from "zod";

export const ModMetadata = ModMetadataV1.extend({
    format: z.literal(2),
    dependencies: z
        .object({
            id: ModID,
            version: semverRange.default("*"),
            optional: z.boolean().default(false),
            loadOrder: z.enum(["before", "after"]).default("after"),
        })
        .array(),
    loadOrder: z.enum(["beforeAll", "afterAll"]).optional(),
});
