import SemVer from "semver/classes/semver.js";
import Range from "semver/classes/range.js";
import { z } from "zod";

export const semver = z.string().transform((str, ctx) => {
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
            code: z.ZodIssueCode.custom,
            message: "Not a valid SemVer range string",
        });
        return z.NEVER;
    }
});

export const ModID = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,48}[a-z0-9]$/g);
