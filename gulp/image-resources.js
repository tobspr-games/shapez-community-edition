import gulp from "gulp";
import path from "node:path/posix";
import atlas2Json from "./atlas2json.js";
import { buildFolder } from "./config.js";

import childProcess from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(childProcess.exec);
const execute = command => {
    const promise = exec(command, {
        encoding: "utf-8",
    });
    promise.child.stderr.pipe(process.stderr);
    return promise;
};

import gulpCached from "gulp-cached";
import gulpClean from "gulp-clean";
import gulpIf from "gulp-if";
import gulpImagemin from "gulp-imagemin";
import imageminGifsicle from "imagemin-gifsicle";
import imageminJpegtran from "imagemin-jpegtran";
import imageminPngquant from "imagemin-pngquant";
import { imageResourcesGlobs, nonImageResourcesGlobs } from "./config.js";

// Lossless options
const minifyImagesOptsLossless = () => [
    imageminJpegtran({
        progressive: true,
    }),
    gulpImagemin.svgo({}),
    gulpImagemin.optipng({
        optimizationLevel: 3,
    }),
    imageminGifsicle({
        optimizationLevel: 3,
        colors: 128,
    }),
];

// Lossy options
const minifyImagesOpts = () => [
    gulpImagemin.mozjpeg({
        quality: 80,
        maxMemory: 1024 * 1024 * 8,
    }),
    gulpImagemin.svgo({}),
    imageminPngquant({
        speed: 1,
        strip: true,
        quality: [0.65, 0.9],
        dithering: false,
        verbose: false,
    }),
    gulpImagemin.optipng({
        optimizationLevel: 3,
    }),
    imageminGifsicle({
        optimizationLevel: 3,
        colors: 128,
    }),
];

// Where the resources folder are
const resourcesDestFolder = path.join(buildFolder, "res");

/**
 * Determines if an atlas must use lossless compression
 * @param {string} fname
 */
function fileMustBeLossless(fname) {
    return fname.indexOf("lossless") >= 0;
}

/////////////// ATLAS /////////////////////

export async function buildAtlas() {
    const config = JSON.stringify("../res_raw/atlas.json");
    const source = JSON.stringify("../res_raw");
    const dest = JSON.stringify("../res_built/atlas");

    try {
        await execute(`java -jar runnable-texturepacker.jar ${source} ${dest} atlas0 ${config}`);
    } catch {
        console.warn("Building atlas failed. Java not found / unsupported version?");
    }
}

// Converts .atlas LibGDX files to JSON
export async function atlasToJson() {
    atlas2Json("../res_built/atlas");
}

// Copies the atlas to the final destination
export function atlas() {
    return gulp.src("../res_built/atlas/*.png").pipe(gulp.dest(resourcesDestFolder));
}

// Copies the atlas to the final destination after optimizing it (lossy compression)
export function atlasOptimized() {
    return gulp
        .src(["../res_built/atlas/*.png"])
        .pipe(
            gulpIf(
                fname => fileMustBeLossless(fname.history[0]),
                gulpImagemin(minifyImagesOptsLossless()),
                gulpImagemin(minifyImagesOpts())
            )
        )
        .pipe(gulp.dest(resourcesDestFolder));
}

//////////////////// RESOURCES //////////////////////

// Copies all resources which are no ui resources
export function copyNonImageResources() {
    return gulp.src(nonImageResourcesGlobs).pipe(gulp.dest(resourcesDestFolder));
}

// Copies all ui resources
export function copyImageResources() {
    return gulp
        .src(imageResourcesGlobs)
        .pipe(gulpCached("imgres.copyImageResources"))
        .pipe(gulp.dest(path.join(resourcesDestFolder)));
}

// Copies all ui resources and optimizes them
export function copyImageResourcesOptimized() {
    return gulp
        .src(imageResourcesGlobs)
        .pipe(
            gulpIf(
                fname => fileMustBeLossless(fname.history[0]),
                gulpImagemin(minifyImagesOptsLossless()),
                gulpImagemin(minifyImagesOpts())
            )
        )
        .pipe(gulp.dest(path.join(resourcesDestFolder)));
}

// Copies all resources and optimizes them
export const allOptimized = gulp.parallel(
    gulp.series(buildAtlas, atlasToJson, atlasOptimized),
    copyNonImageResources,
    copyImageResourcesOptimized
);

// Cleans up unused images which are instead inline into the css
export function cleanupUnusedCssInlineImages() {
    return gulp
        .src(
            [
                path.join(buildFolder, "res", "ui", "**", "*.png"),
                path.join(buildFolder, "res", "ui", "**", "*.jpg"),
                path.join(buildFolder, "res", "ui", "**", "*.svg"),
                path.join(buildFolder, "res", "ui", "**", "*.gif"),
            ],
            { read: false }
        )
        .pipe(gulpIf(fname => fname.history[0].indexOf("noinline") < 0, gulpClean({ force: true })));
}
