import gulp from "gulp";
import webpack from "webpack";
import { BUILD_VARIANTS } from "./build_variants.js";
import { buildFolder } from "./config.js";

import webpackConfig from "./webpack.config.js";
import webpackProductionConfig from "./webpack.production.config.js";

import webpackStream from "webpack-stream";

/**
 * PROVIDES (per <variant>)
 *
 * js.<variant>.dev.watch
 * js.<variant>.dev
 * js.<variant>.prod
 *
 */

// TODO: Move webpack config to build_variants.js and use a separate
// build variant for development
export default Object.fromEntries(
    Object.entries(BUILD_VARIANTS).map(([variant, data]) => {
        const dev = {
            build() {
                return gulp
                    .src("../src/js/main.js")
                    .pipe(webpackStream(webpackConfig, webpack))
                    .pipe(gulp.dest(buildFolder));
            },
        };

        const prod = {
            build() {
                return gulp
                    .src("../src/js/main.js")
                    .pipe(webpackStream(webpackProductionConfig, webpack))
                    .pipe(gulp.dest(buildFolder));
            },
        };

        return [variant, { dev, prod }];
    })
);
