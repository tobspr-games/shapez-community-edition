import gulp from "gulp";
import path from "path/posix";
import { buildFolder } from "./config.js";

import cssMqpacker from "css-mqpacker";
import cssnano from "cssnano";
import gulpSass from "gulp-sass";
import * as sass from "sass-embedded";
import gulpPlumber from "gulp-plumber";
import gulpPostcss from "gulp-postcss";
import gulpRename from "gulp-rename";
import postcssAssets from "postcss-assets";
import postcssCriticalSplit from "postcss-critical-split";

const gulpSassCompiler = gulpSass(sass);

// The assets plugin copies the files
const postcssAssetsPlugin = postcssAssets({
    loadPaths: [path.join(buildFolder, "res", "ui")],
    basePath: buildFolder,
    baseUrl: ".",
});

// Postcss configuration
const postcssPlugins = prod => {
    const plugins = [postcssAssetsPlugin];
    if (prod) {
        plugins.push(
            cssMqpacker({
                sort: true,
            }),
            cssnano({
                preset: [
                    "advanced",
                    {
                        cssDeclarationSorter: false,
                        discardUnused: true,
                        mergeIdents: false,
                        reduceIdents: true,
                        zindex: true,
                    },
                ],
            })
        );
    }
    return plugins;
};

function resourcesTask({ isProd }) {
    return gulp
        .src("../src/css/main.scss")
        .pipe(gulpPlumber())
        .pipe(gulpSassCompiler().on("error", gulpSassCompiler.logError))
        .pipe(
            gulpPostcss([
                postcssCriticalSplit({
                    blockTag: "@load-async",
                }),
            ])
        )
        .pipe(gulpRename("async-resources.css"))
        .pipe(gulpPostcss(postcssPlugins(isProd)))
        .pipe(gulp.dest(buildFolder));
}

export const resources = {
    // Builds the css resources
    dev: () => resourcesTask({ isProd: false }),

    // Builds the css resources in prod (=minified)
    prod: () => resourcesTask({ isProd: true }),
};

function mainTask({ isProd }) {
    return gulp
        .src("../src/css/main.scss")
        .pipe(gulpPlumber())
        .pipe(gulpSassCompiler().on("error", gulpSassCompiler.logError))
        .pipe(
            gulpPostcss([
                postcssCriticalSplit({
                    blockTag: "@load-async",
                    output: "rest",
                }),
            ])
        )
        .pipe(gulpPostcss(postcssPlugins(isProd)))
        .pipe(gulp.dest(buildFolder));
}

export const main = {
    // Builds the css main
    dev: () => mainTask({ isProd: false }),

    // Builds the css main in prod (=minified)
    prod: () => mainTask({ isProd: true }),
};

export const dev = gulp.parallel(main.dev, resources.dev);
export const prod = gulp.parallel(main.prod, resources.prod);
