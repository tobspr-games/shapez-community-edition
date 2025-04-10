import { execSync } from "child_process";
import fs from "fs";

export function getRevision(useLast = false) {
    const commitHash = execSync("git rev-parse --short " + (useLast ? "HEAD^1" : "HEAD")).toString("ascii");
    return commitHash.replace(/^\s+|\s+$/g, "");
}

export function getAllResourceImages() {
    return fs
        .globSync("res/**/*.@(png|svg|jpg)", { cwd: ".." })
        .map(f => f.replace(/^res\//gi, ""))
        .filter(f => {
            if (f.indexOf("ui") >= 0) {
                // We drop all ui images except for the noinline ones
                return f.indexOf("noinline") >= 0;
            }
            return true;
        });
}

export function getVersion() {
    // Use the version number specified in package.json
    return JSON.parse(fs.readFileSync("../package.json", "utf-8")).version;
}
