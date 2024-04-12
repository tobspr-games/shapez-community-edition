import glob from "glob";
import { execSync } from "child_process";
import fs from "fs";

export function getRevision(useLast = false) {
    const commitHash = execSync("git rev-parse --short " + (useLast ? "HEAD^1" : "HEAD")).toString("ascii");
    return commitHash.replace(/^\s+|\s+$/g, "");
}

export function getAllResourceImages() {
    return glob
        .sync("res/**/*.@(png|svg|jpg)", { cwd: ".." })
        .map(f => f.replace(/^res\//gi, ""))
        .filter(f => {
            if (f.indexOf("ui") >= 0) {
                // We drop all ui images except for the noinline ones
                return f.indexOf("noinline") >= 0;
            }
            return true;
        });
}

export function getTag() {
    try {
        return execSync("git describe --tag --exact-match").toString("ascii");
    } catch (e) {
        throw new Error("Current git HEAD is not a version tag");
    }
}

export function getVersion() {
    // Use the version number specified in package.json
    return JSON.parse(fs.readFileSync("../package.json", "utf-8")).version;
}

/**
 * @param {string} url
 * @param {string} commitHash
 */
export function cachebust(url, commitHash) {
    return "/v/" + commitHash + "/" + url;
}
