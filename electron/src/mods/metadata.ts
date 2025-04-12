import SemVer from "semver/classes/semver.js";
import { z } from "zod";

const semver = z.string().transform((str, ctx) => {
    try {
        return new SemVer(str);
    } catch {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Not a valid SemVer version string",
        });
        return z.NEVER;
    }
});

// TBD: dependencies, icons, readme
export const ModMetadata = z.object({
    format: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,48}[a-z0-9]$/g),
    entry: z.string().nonempty(),
    name: z.string().nonempty(),
    description: z.ostring(),
    authors: z
        .object({
            name: z.string().nonempty(),
            website: z.string().url().optional(),
        })
        .array(),
    version: semver,
    savegameResident: z.boolean().default(true),
    website: z.string().url().optional(),
    source: z.string().url().optional(),
});

export type ModMetadata = z.infer<typeof ModMetadata>;
export type IpcModMetadata = Omit<ModMetadata, "version"> & {
    version: string;
};
