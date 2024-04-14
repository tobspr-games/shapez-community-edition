import packager from "electron-packager";
import pj from "../electron/package.json" assert { type: "json" };
import path from "path/posix";
import { getVersion } from "./buildutils.js";
import fs from "fs";
import { execSync } from "child_process";
import { BUILD_VARIANTS } from "./build_variants.js";

import gulpClean from "gulp-clean";

export default function gulptasksStandalone(gulp) {
    for (const variant in BUILD_VARIANTS) {
        const variantData = BUILD_VARIANTS[variant];
        if (!variantData.standalone) {
            continue;
        }
        const tempDestDir = path.join("..", "build_output", variant);
        const taskPrefix = "standalone." + variant;
        const electronBaseDir = path.join("..", "electron");
        const tempDestBuildDir = path.join(tempDestDir, "built");

        gulp.task(taskPrefix + ".prepare.cleanup", () => {
            return gulp.src(tempDestDir, { read: false, allowEmpty: true }).pipe(gulpClean({ force: true }));
        });

        gulp.task(taskPrefix + ".prepare.copyPrefab", () => {
            const requiredFiles = [
                path.join(electronBaseDir, "node_modules", "**", "*.*"),
                path.join(electronBaseDir, "node_modules", "**", ".*"),
                path.join(electronBaseDir, "favicon*"),
            ];
            return gulp.src(requiredFiles, { base: electronBaseDir }).pipe(gulp.dest(tempDestBuildDir));
        });

        gulp.task(taskPrefix + ".prepare.writePackageJson", cb => {
            const packageJsonString = JSON.stringify(
                {
                    scripts: {
                        start: pj.scripts.start,
                    },
                    devDependencies: pj.devDependencies,
                    dependencies: pj.dependencies,
                    optionalDependencies: pj.optionalDependencies,
                },
                null,
                4
            );

            fs.writeFileSync(path.join(tempDestBuildDir, "package.json"), packageJsonString);

            cb();
        });

        gulp.task(taskPrefix + ".prepare.minifyCode", () => {
            return gulp.src(path.join(electronBaseDir, "*.js")).pipe(gulp.dest(tempDestBuildDir));
        });

        gulp.task(taskPrefix + ".prepare.copyGamefiles", () => {
            return gulp.src("../build/**/*.*", { base: "../build" }).pipe(gulp.dest(tempDestBuildDir));
        });

        gulp.task(taskPrefix + ".killRunningInstances", cb => {
            try {
                execSync("taskkill /F /IM shapezio.exe");
            } catch (ex) {
                console.warn("Failed to kill running instances, maybe none are up.");
            }
            cb();
        });

        gulp.task(
            taskPrefix + ".prepare",
            gulp.series(
                taskPrefix + ".killRunningInstances",
                taskPrefix + ".prepare.cleanup",
                taskPrefix + ".prepare.copyPrefab",
                taskPrefix + ".prepare.writePackageJson",
                taskPrefix + ".prepare.minifyCode",
                taskPrefix + ".prepare.copyGamefiles"
            )
        );

        /**
         *
         * @param {'win32'|'linux'|'darwin'} platform
         * @param {'x64'|'ia32'} arch
         * @param {function():void} cb
         */
        function packageStandalone(platform, arch, cb) {
            packager({
                dir: tempDestBuildDir,
                appCopyright: "tobspr Games",
                appVersion: getVersion(),
                arch,
                platform,
                asar: true,
                executableName: "shapezio",
                icon: path.join(electronBaseDir, "favicon"),
                name: "shapez",
                out: tempDestDir,
                overwrite: true,
                appBundleId: "tobspr.shapezio." + variant,
                appCategoryType: "public.app-category.games",
            }).then(
                appPaths => {
                    console.log("Packages created:", appPaths);
                    appPaths.forEach(appPath => {
                        if (!fs.existsSync(appPath)) {
                            console.error("Bad app path:", appPath);
                            return;
                        }

                        fs.writeFileSync(
                            path.join(appPath, "LICENSE"),
                            fs.readFileSync(path.join("..", "LICENSE"))
                        );

                        if (platform === "linux") {
                            // Write launcher script
                            fs.writeFileSync(
                                path.join(appPath, "play.sh"),
                                '#!/usr/bin/env bash\n./shapezio --no-sandbox "$@"\n'
                            );
                            fs.chmodSync(path.join(appPath, "play.sh"), 0o775);
                        }
                    });

                    cb();
                },
                err => {
                    console.error("Packaging error:", err);
                    cb();
                }
            );
        }

        gulp.task(taskPrefix + ".package.win32", cb => packageStandalone("win32", "x64", cb));
        gulp.task(taskPrefix + ".package.linux", cb => packageStandalone("linux", "x64", cb));
        gulp.task(taskPrefix + ".package.darwin", cb => packageStandalone("darwin", "x64", cb));
    }
}
