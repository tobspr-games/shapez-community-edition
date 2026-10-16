import { execSync } from "node:child_process";
import fs from "node:fs";

export function getRevision(useLast = false) {
    const commitHash = execSync("git rev-parse --short " + (useLast ? "HEAD^1" : "HEAD")).toString("ascii");
    return commitHash.trim();
}

export function getAllResourceImages() {
    return fs.globSync("./**/*.@(png|svg|jpg)", { cwd: "../res" }).filter(f => {
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
