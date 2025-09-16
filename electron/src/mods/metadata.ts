import Range from "semver/classes/range.js";
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

export const semverRange = z.string().transform((str, ctx) => {
    try {
        return new Range(str);
    } catch {
        ctx.addIssue({
            code: "custom",
            message: "Not a valid SemVer range string",
        });
        return z.NEVER;
    }
});

const ModID = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,48}[a-z0-9]$/g);

// TBD: icons, readme
export const ModMetadata = z.object({
    format: z.literal(1),
    id: ModID,
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

export type ModMetadata = z.infer<typeof ModMetadata>;
export type IpcModMetadata = Omit<ModMetadata, "version" | "dependencies"> & {
    version: string;
    dependencies: (Omit<ModMetadata["dependencies"][number], "version"> & {
        version: string;
    })[];
};
