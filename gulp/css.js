import path from "path/posix";
import { getRevision } from "./buildutils.js";

import gulpPostcss from "gulp-postcss";
import postcssAssets from "postcss-assets";
import postcssPresetEnv from "postcss-preset-env";
import postcssRoundSubpixels from "postcss-round-subpixels";
import postcssCriticalSplit from "postcss-critical-split";
import cssMqpacker from "css-mqpacker";
import cssnano from "cssnano";
import gulpSassLint from "gulp-sass-lint";
import gulpDartSass from "gulp-dart-sass";
import gulpPlumber from "gulp-plumber";
import gulpRename from "gulp-rename";

export default function gulptasksCSS(gulp, buildFolder, browserSync) {
    // The assets plugin copies the files
    const commitHash = getRevision();
    const postcssAssetsPlugin = postcssAssets({
        loadPaths: [path.join(buildFolder, "res", "ui")],
        basePath: buildFolder,
        baseUrl: ".",
    });

    // Postcss configuration
    const postcssPlugins = prod => {
        const plugins = [postcssAssetsPlugin];
        if (prod) {
            plugins.unshift(
                postcssPresetEnv({
                    browsers: ["> 0.1%"],
                })
            );

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
                }),
                postcssRoundSubpixels()
            );
        }
        return plugins;
    };

    // Performs linting on css
    gulp.task("css.lint", () => {
        return gulp
            .src(["../src/css/**/*.scss"])
            .pipe(gulpSassLint({ configFile: ".sasslint.yml" }))
            .pipe(gulpSassLint.format())
            .pipe(gulpSassLint.failOnError());
    });

    function resourcesTask({ isProd }) {
        return gulp
            .src("../src/css/main.scss")
            .pipe(gulpPlumber())
            .pipe(gulpDartSass.sync().on("error", gulpDartSass.logError))
            .pipe(
                gulpPostcss([
                    postcssCriticalSplit({
                        blockTag: "@load-async",
                    }),
                ])
            )
            .pipe(gulpRename("async-resources.css"))
            .pipe(gulpPostcss(postcssPlugins(isProd)))
            .pipe(gulp.dest(buildFolder))
            .pipe(browserSync.stream());
    }

    // Builds the css resources
    gulp.task("css.resources.dev", () => {
        return resourcesTask({ isProd: false });
    });

    // Builds the css resources in prod (=minified)
    gulp.task("css.resources.prod", () => {
        return resourcesTask({ isProd: true });
    });

    function mainTask({ isProd }) {
        return gulp
            .src("../src/css/main.scss")
            .pipe(gulpPlumber())
            .pipe(gulpDartSass.sync().on("error", gulpDartSass.logError))
            .pipe(
                gulpPostcss([
                    postcssCriticalSplit({
                        blockTag: "@load-async",
                        output: "rest",
                    }),
                ])
            )
            .pipe(gulpPostcss(postcssPlugins(isProd)))
            .pipe(gulp.dest(buildFolder))
            .pipe(browserSync.stream());
    }

    // Builds the css main
    gulp.task("css.main.dev", () => {
        return mainTask({ isProd: false });
    });

    // Builds the css main in prod (=minified)
    gulp.task("css.main.prod", () => {
        return mainTask({ isProd: true });
    });

    gulp.task("css.dev", gulp.parallel("css.main.dev", "css.resources.dev"));
    gulp.task("css.prod", gulp.parallel("css.main.prod", "css.resources.prod"));
}
