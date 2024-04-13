import packager from "electron-packager";
import pj from "../electron/package.json" assert { type: "json" };
import path from "path/posix";
import { getRevision, getVersion } from "./buildutils.js";
import fs from "fs";
import { execSync } from "child_process";
import electronNotarize from "electron-notarize";
import { BUILD_VARIANTS } from "./build_variants.js";

import gulpClean from "gulp-clean";

let signAsync;
try {
    signAsync = (await import("tobspr-osx-sign")).signAsync;
} catch (ex) {
    console.warn("tobspr-osx-sign not installed, can not create osx builds");
}

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
        function packageStandalone(platform, arch, cb, isRelease = true) {
            const privateArtifactsPath = "node_modules/shapez.io-private-artifacts";

            // Unpack private artifacts
            /** @type {boolean | { unpackDir: string }} */
            let asar = true;
            if (fs.existsSync(path.join(tempDestBuildDir, privateArtifactsPath))) {
                asar = { unpackDir: privateArtifactsPath };
            }

            packager({
                dir: tempDestBuildDir,
                appCopyright: "tobspr Games",
                appVersion: getVersion(),
                buildVersion: "1.0.0",
                arch,
                platform,
                asar,
                executableName: "shapezio",
                icon: path.join(electronBaseDir, "favicon"),
                name: "shapez",
                out: tempDestDir,
                overwrite: true,
                appBundleId: "tobspr.shapezio." + variant,
                appCategoryType: "public.app-category.games",
                ...(isRelease &&
                    platform === "darwin" && {
                        osxSign: {
                            "identity": process.env.SHAPEZ_CLI_APPLE_CERT_NAME,
                            "hardenedRuntime": true,
                            "entitlements": "entitlements.plist",
                            "entitlements-inherit": "entitlements.plist",
                            // @ts-ignore
                            "signatureFlags": ["library"],
                            "version": "16.0.7",
                        },
                        osxNotarize: {
                            appleId: process.env.SHAPEZ_CLI_APPLE_ID,
                            appleIdPassword: process.env.SHAPEZ_CLI_APPLE_APP_PW,
                        },
                    }),
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

        // Manual signing with patched @electron/osx-sign (we need --no-strict)
        gulp.task(taskPrefix + ".package.darwin", cb =>
            packageStandalone(
                "darwin",
                "x64",
                () => {
                    const appFile = path.join(tempDestDir, "shapez-darwin-x64");
                    const appFileInner = path.join(appFile, "shapez.app");
                    console.warn("++ Signing ++");

                    console.warn("Base dir:", appFile);

                    signAsync({
                        app: appFileInner,
                        hardenedRuntime: true,
                        identity: process.env.SHAPEZ_CLI_APPLE_CERT_NAME,
                        strictVerify: false,

                        version: "16.0.7",
                        type: "distribution",
                        optionsForFile: f => {
                            return {
                                entitlements: path.join("entitlements.plist"),
                                hardenedRuntime: true,
                                signatureFlags: ["runtime"],
                            };
                        },
                    }).then(() => {
                        execSync(`codesign --verify --verbose ${path.join(appFile, "shapez.app")}`, {
                            cwd: appFile,
                        });

                        console.warn("++ Notarizing ++");
                        electronNotarize
                            .notarize({
                                appPath: path.join(appFile, "shapez.app"),
                                tool: "legacy",
                                appBundleId: "tobspr.shapezio.standalone",

                                appleId: process.env.SHAPEZ_CLI_APPLE_ID,
                                appleIdPassword: process.env.SHAPEZ_CLI_APPLE_APP_PW,
                                teamId: process.env.SHAPEZ_CLI_APPLE_TEAM_ID,
                            })
                            .then(() => {
                                console.warn("-> Notarized!");
                                cb();
                            });
                    });
                },
                false
            )
        );

        gulp.task(taskPrefix + ".package.win32", cb => packageStandalone("win32", "x64", cb));
        gulp.task(taskPrefix + ".package.linux", cb => packageStandalone("linux", "x64", cb));
    }
}
