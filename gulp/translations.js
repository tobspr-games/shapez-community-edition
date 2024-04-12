import path from "path/posix";
import fs from "fs";
import gulpYaml from "gulp-yaml";
import YAML from "yaml";

import gulpPlumber from "gulp-plumber";

const translationsSourceDir = path.join("..", "translations");
const translationsJsonDir = path.join("..", "src", "js", "built-temp");

export default function gulptasksTranslations(gulp) {
    gulp.task("translations.convertToJson", () => {
        return gulp
            .src(path.join(translationsSourceDir, "*.yaml"))
            .pipe(gulpPlumber())
            .pipe(gulpYaml({ space: 2, safe: true }))
            .pipe(gulp.dest(translationsJsonDir));
    });

    gulp.task("translations.fullBuild", gulp.series("translations.convertToJson"));
}
