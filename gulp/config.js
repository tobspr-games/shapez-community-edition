import BrowserSync from "browser-sync";
import path from "path/posix";

export const baseDir = path.resolve("..");
export const buildFolder = path.join(baseDir, "build");
export const buildOutputFolder = path.join(baseDir, "build_output");

// Globs for atlas resources
export const rawImageResourcesGlobs = ["../res_raw/atlas.json", "../res_raw/**/*.png"];

// Globs for non-ui resources
export const nonImageResourcesGlobs = ["../res/**/*.woff2", "../res/*.ico", "../res/**/*.webm"];

// Globs for ui resources
export const imageResourcesGlobs = [
    "../res/**/*.png",
    "../res/**/*.svg",
    "../res/**/*.jpg",
    "../res/**/*.gif",
];

export const browserSync = BrowserSync.create();
