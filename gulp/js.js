import { BUILD_VARIANTS } from "./build_variants.js";

import webpackConfig from "./webpack.config.js";
import webpackProductionConfig from "./webpack.production.config.js";

import webpackStream from "webpack-stream";
import gulpRename from "gulp-rename";

/**
 * PROVIDES (per <variant>)
 *
 * js.<variant>.dev.watch
 * js.<variant>.dev
 * js.<variant>.prod
 *
 */

export default function gulptasksJS(gulp, buildFolder, browserSync) {
    //// DEV

    for (const variant in BUILD_VARIANTS) {
        const data = BUILD_VARIANTS[variant];

        gulp.task("js." + variant + ".dev.watch", () => {
            gulp.src("../src/js/main.js")
                .pipe(webpackStream(webpackConfig))
                .pipe(gulp.dest(buildFolder))
                .pipe(browserSync.stream());
        });

        if (!data.standalone) {
            // WEB

            gulp.task("js." + variant + ".dev", () => {
                return gulp
                    .src("../src/js/main.js")
                    .pipe(webpackStream(webpackConfig))
                    .pipe(gulp.dest(buildFolder));
            });

            gulp.task("js." + variant + ".prod.transpiled", () => {
                return gulp
                    .src("../src/js/main.js")
                    .pipe(webpackStream(webpackProductionConfig))
                    .pipe(gulpRename("bundle-transpiled.js"))
                    .pipe(gulp.dest(buildFolder));
            });

            gulp.task("js." + variant + ".prod.es6", () => {
                return gulp
                    .src("../src/js/main.js")
                    .pipe(webpackStream(webpackProductionConfig))
                    .pipe(gulp.dest(buildFolder));
            });
            gulp.task(
                "js." + variant + ".prod",

                // transpiled currently not used
                // gulp.parallel("js." + variant + ".prod.transpiled", "js." + variant + ".prod.es6")
                gulp.parallel("js." + variant + ".prod.es6")
            );
        } else {
            // STANDALONE
            gulp.task("js." + variant + ".dev", () => {
                return gulp
                    .src("../src/js/main.js")
                    .pipe(webpackStream(webpackConfig))
                    .pipe(gulp.dest(buildFolder));
            });
            gulp.task("js." + variant + ".prod", () => {
                return gulp
                    .src("../src/js/main.js")
                    .pipe(webpackStream(webpackProductionConfig))
                    .pipe(gulp.dest(buildFolder));
            });
        }
    }
}
