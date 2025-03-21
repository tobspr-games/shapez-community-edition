import packager from "electron-packager";
import fs from "fs/promises";
import gulp from "gulp";
import path from "path/posix";
import electronPackageJson from "../electron/package.json" with { type: "json" };
import { BUILD_VARIANTS } from "./build_variants.js";
import { getVersion } from "./buildutils.js";
import { buildProject } from "./typescript.js";

import gulpClean from "gulp-clean";

const platforms = /** @type {const} */ (["win32", "linux", "darwin"]);
const architectures = /** @type {const} */ (["x64", "arm64"]);

export default Object.fromEntries(
    Object.entries(BUILD_VARIANTS)
        .filter(([variant, variantData]) => variantData.standalone)
        .map(([variant, variantData]) => {
            const tempDestDir = path.join("..", "build_output", variant);
            const electronBaseDir = path.join("..", "electron");
            const tempDestBuildDir = path.join(tempDestDir, "built");

            function cleanup() {
                return gulp
                    .src(tempDestDir, { read: false, allowEmpty: true })
                    .pipe(gulpClean({ force: true }));
            }

            function copyPrefab() {
                const requiredFiles = [
                    path.join(electronBaseDir, "preload.cjs"),
                    path.join(electronBaseDir, "node_modules", "**", "*.*"),
                    path.join(electronBaseDir, "node_modules", "**", ".*"),
                    path.join(electronBaseDir, "favicon*"),
                ];
                return gulp.src(requiredFiles, { base: electronBaseDir }).pipe(gulp.dest(tempDestBuildDir));
            }

            async function transpileTypeScript() {
                const tsconfigPath = path.join(electronBaseDir, "tsconfig.json");
                const outDir = path.join(tempDestBuildDir, "dist");

                buildProject(tsconfigPath, undefined, outDir);
                return Promise.resolve();
            }

            async function writePackageJson() {
                const pkgJson = structuredClone(electronPackageJson);
                pkgJson.version = getVersion();
                delete pkgJson.scripts;

                const packageJsonString = JSON.stringify(pkgJson);
                await fs.writeFile(path.join(tempDestBuildDir, "package.json"), packageJsonString);
            }

            function copyGamefiles() {
                return gulp.src("../build/**/*.*", { base: "../build" }).pipe(gulp.dest(tempDestBuildDir));
            }

            const prepare = {
                cleanup,
                copyPrefab,
                transpileTypeScript,
                writePackageJson,
                copyGamefiles,
                all: gulp.series(cleanup, copyPrefab, transpileTypeScript, writePackageJson, copyGamefiles),
            };

            /**
             *
             * @param {typeof platforms[number] | (typeof platforms[number])[]} platform
             * @param {typeof architectures[number] | (typeof architectures[number])[]} arch
             */
            async function packageStandalone(platform, arch) {
                const appPaths = await packager({
                    dir: tempDestBuildDir,
                    appCopyright: "tobspr Games",
                    appVersion: getVersion(),
                    buildVersion: "1.0.0",
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
                });

                console.log("Packages created:", appPaths);
                await Promise.all(
                    appPaths.map(async appPath => {
                        await fs.writeFile(
                            path.join(appPath, "LICENSE"),
                            await fs.readFile(path.join("..", "LICENSE"))
                        );
                    })
                );
            }

            const pack = {
                ...Object.fromEntries(
                    platforms.flatMap(platform =>
                        architectures.map(arch => [
                            `${platform}-${arch}`,
                            () => packageStandalone(platform, arch),
                        ])
                    )
                ),
                // TODO: Review this hack forced by readonly types
                all: () => packageStandalone([...platforms], [...architectures]),
            };

            return [
                variant,
                {
                    prepare,
                    package: pack,
                },
            ];
        })
);
