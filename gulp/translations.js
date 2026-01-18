import gulp from "gulp";
import path from "node:path/posix";

import gulpPlumber from "gulp-plumber";
import gulpYaml from "gulp-yaml";
import { generatedCodeFolder } from "./config.js";

const translationsSourceDir = path.join("..", "translations");

export function convertToJson() {
    return gulp
        .src(path.join(translationsSourceDir, "*.yaml"))
        .pipe(gulpPlumber())
        .pipe(gulpYaml({ space: 2, safe: true }))
        .pipe(gulp.dest(generatedCodeFolder));
}

export const fullBuild = convertToJson;
