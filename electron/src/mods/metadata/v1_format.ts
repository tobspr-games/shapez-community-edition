import { semver, ModID } from "./common.js";
import { z } from "zod";

export const ModMetadata = z.object({
    format: z.literal(1),
    id: ModID,
    entry: z.string().nonempty(),
    name: z.string().nonempty(),
    description: z.string().optional(),
    authors: z
        .object({
            name: z.string().nonempty(),
            website: z.url().optional(),
        })
        .array(),
    version: semver,
    savegameResident: z.boolean().default(true),
    website: z.url().optional(),
    source: z.url().optional(),
});
