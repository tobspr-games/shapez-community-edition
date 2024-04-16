import gulp from "gulp";
import BrowserSync from "browser-sync";
const browserSync = BrowserSync.create({});
import path from "path/posix";
import pathNative from "path";
import deleteEmpty from "delete-empty";
import { execSync } from "child_process";

// Load other plugins
import gulpClean from "gulp-clean";
import gulpWebserver from "gulp-webserver";

// Check environment variables

const envVars = [
    "SHAPEZ_CLI_SERVER_HOST",
    "SHAPEZ_CLI_ALPHA_FTP_USER",
    "SHAPEZ_CLI_ALPHA_FTP_PW",
    "SHAPEZ_CLI_STAGING_FTP_USER",
    "SHAPEZ_CLI_STAGING_FTP_PW",
    "SHAPEZ_CLI_LIVE_FTP_USER",
    "SHAPEZ_CLI_LIVE_FTP_PW",
    "SHAPEZ_CLI_APPLE_ID",
    "SHAPEZ_CLI_APPLE_CERT_NAME",
    "SHAPEZ_CLI_GITHUB_USER",
    "SHAPEZ_CLI_GITHUB_TOKEN",
];

for (let i = 0; i < envVars.length; ++i) {
    if (!process.env[envVars[i]]) {
        console.warn("Unset environment variable, might cause issues:", envVars[i]);
    }
}

const baseDir = path.resolve("..");
const buildFolder = path.join(baseDir, "build");
const buildOuptutFolder = path.join(baseDir, "build_output");

import gulptasksImageResources, * as imgres from "./image-resources.js";
gulptasksImageResources(gulp, buildFolder);

import gulptasksCSS from "./css.js";
gulptasksCSS(gulp, buildFolder, browserSync);

import gulptasksSounds from "./sounds.js";
gulptasksSounds(gulp, buildFolder);

import gulptasksLocalConfig from "./local-config.js";
gulptasksLocalConfig(gulp);

import gulptasksJS from "./js.js";
gulptasksJS(gulp, buildFolder, browserSync);

import gulptasksHTML from "./html.js";
gulptasksHTML(gulp, buildFolder);

import gulptasksFTP from "./ftp.js";
gulptasksFTP(gulp, buildFolder);

import gulptasksDocs from "./docs.js";
gulptasksDocs(gulp, buildFolder);

import gulptasksStandalone from "./standalone.js";
gulptasksStandalone(gulp);

import gulptasksTranslations from "./translations.js";
import { BUILD_VARIANTS } from "./build_variants.js";
gulptasksTranslations(gulp);

/////////////////////  BUILD TASKS  /////////////////////

// Cleans up everything
gulp.task("utils.cleanBuildFolder", () => {
    return gulp.src(buildFolder, { read: false, allowEmpty: true }).pipe(gulpClean({ force: true }));
});
gulp.task("utils.cleanBuildOutputFolder", () => {
    return gulp.src(buildOuptutFolder, { read: false, allowEmpty: true }).pipe(gulpClean({ force: true }));
});
gulp.task("utils.cleanBuildTempFolder", () => {
    return gulp
        .src(path.join("..", "src", "js", "built-temp"), { read: false, allowEmpty: true })
        .pipe(gulpClean({ force: true }));
});
gulp.task("utils.cleanImageBuildFolder", () => {
    return gulp
        .src(path.join("res_built"), { read: false, allowEmpty: true })
        .pipe(gulpClean({ force: true }));
});

gulp.task(
    "utils.cleanup",
    gulp.series("utils.cleanBuildFolder", "utils.cleanImageBuildFolder", "utils.cleanBuildTempFolder")
);

// Requires no uncomitted files
gulp.task("utils.requireCleanWorkingTree", cb => {
    let output = execSync("git status -su").toString("ascii").trim().replace(/\r/gi, "").split("\n");

    // Filter files which are OK to be untracked
    output = output
        .map(x => x.replace(/[\r\n]+/gi, ""))
        .filter(x => x.indexOf(".local.js") < 0)
        .filter(x => x.length > 0);
    if (output.length > 0) {
        console.error("\n\nYou have unstaged changes, please commit everything first!");
        console.error("Unstaged files:");
        console.error(output.map(x => "'" + x + "'").join("\n"));
        process.exit(1);
    }
    cb();
});

gulp.task("utils.copyAdditionalBuildFiles", cb => {
    const additionalFolder = path.join("additional_build_files");
    const additionalSrcGlobs = [
        path.join(additionalFolder, "**/*.*"),
        path.join(additionalFolder, "**/.*"),
        path.join(additionalFolder, "**/*"),
    ];

    return gulp.src(additionalSrcGlobs).pipe(gulp.dest(buildFolder));
});

// Starts a webserver on the built directory (useful for testing prod build)
gulp.task("main.webserver", () => {
    return gulp.src(buildFolder).pipe(
        gulpWebserver({
            livereload: {
                enable: true,
            },
            directoryListing: false,
            open: true,
            port: 3005,
        })
    );
});

/**
 *
 * @param {object} param0
 * @param {keyof typeof BUILD_VARIANTS} param0.version
 */
function serveHTML({ version = "web-dev" }) {
    browserSync.init({
        server: [buildFolder, path.join(baseDir, "mod_examples")],
        port: 3005,
        ghostMode: {
            clicks: false,
            scroll: false,
            location: false,
            forms: false,
        },
        logLevel: "info",
        logPrefix: "BS",
        online: false,
        xip: false,
        notify: false,
        reloadDebounce: 100,
        reloadOnRestart: true,
        watchEvents: ["add", "change"],
    });

    // Watch .scss files, those trigger a css rebuild
    gulp.watch(["../src/**/*.scss"], gulp.series("css.dev"));

    // Watch .html files, those trigger a html rebuild
    gulp.watch("../src/**/*.html", gulp.series("html.dev"));
    gulp.watch("./preloader/*.*", gulp.series("html.dev"));

    // Watch translations
    gulp.watch("../translations/**/*.yaml", gulp.series("translations.convertToJson"));

    gulp.watch(
        ["../res_raw/sounds/sfx/*.mp3", "../res_raw/sounds/sfx/*.wav"],
        gulp.series("sounds.sfx", "sounds.copy")
    );
    gulp.watch(
        ["../res_raw/sounds/music/*.mp3", "../res_raw/sounds/music/*.wav"],
        gulp.series("sounds.music", "sounds.copy")
    );

    // Watch resource files and copy them on change
    gulp.watch(imgres.rawImageResourcesGlobs, gulp.series("imgres.buildAtlas"));
    gulp.watch(imgres.nonImageResourcesGlobs, gulp.series("imgres.copyNonImageResources"));
    gulp.watch(imgres.imageResourcesGlobs, gulp.series("imgres.copyImageResources"));

    // Watch .atlas files and recompile the atlas on change
    gulp.watch("../res_built/atlas/*.atlas", gulp.series("imgres.atlasToJson"));
    gulp.watch("../res_built/atlas/*.json", gulp.series("imgres.atlas"));

    // Watch the build folder and reload when anything changed
    const extensions = ["html", "js", "png", "gif", "jpg", "svg", "mp3", "ico", "woff2", "json"];
    gulp.watch(extensions.map(ext => path.join(buildFolder, "**", "*." + ext))).on("change", function (p) {
        return gulp
            .src(pathNative.resolve(p).replaceAll(pathNative.sep, path.sep))
            .pipe(browserSync.reload({ stream: true }));
    });

    gulp.watch("../src/js/built-temp/*.json").on("change", function (p) {
        return gulp
            .src(pathNative.resolve(p).replaceAll(pathNative.sep, path.sep))
            .pipe(browserSync.reload({ stream: true }));
    });

    gulp.series("js." + version + ".dev.watch")(() => true);
}

// Pre and postbuild
gulp.task("step.baseResources", gulp.series("imgres.allOptimized"));
gulp.task("step.deleteEmpty", cb => {
    deleteEmpty.sync(buildFolder);
    cb();
});

gulp.task("step.postbuild", gulp.series("imgres.cleanupUnusedCssInlineImages", "step.deleteEmpty"));

/////////////////////  RUNNABLE TASKS  /////////////////////

// Builds everything (dev)
gulp.task(
    "build.prepare.dev",
    gulp.series(
        "utils.cleanup",
        "utils.copyAdditionalBuildFiles",
        "localConfig.findOrCreate",
        "imgres.buildAtlas",
        "imgres.atlasToJson",
        "imgres.atlas",
        "sounds.dev",
        "imgres.copyImageResources",
        "imgres.copyNonImageResources",
        "translations.fullBuild",
        "css.dev"
    )
);

// Builds everything for every variant
for (const variant in BUILD_VARIANTS) {
    const data = BUILD_VARIANTS[variant];
    const buildName = "build." + variant;

    // build
    gulp.task(
        buildName + ".code",
        gulp.series(
            data.standalone ? "sounds.fullbuildHQ" : "sounds.fullbuild",
            "translations.fullBuild",
            "js." + variant + ".prod"
        )
    );

    gulp.task(buildName + ".resourcesAndCode", gulp.parallel("step.baseResources", buildName + ".code"));

    gulp.task(
        buildName + ".all",
        gulp.series(buildName + ".resourcesAndCode", "css.prod-standalone", "html.prod")
    );

    gulp.task(buildName, gulp.series("utils.cleanup", buildName + ".all", "step.postbuild"));

    // Tasks for creating distributable packages
    if (data.standalone) {
        // TODO: Figure out macOS support as a non-published app
        const packagePlatforms = ["win32", "linux"];

        for (const platform of packagePlatforms) {
            gulp.task(
                `package.${variant}.${platform}`,
                gulp.series(
                    `build.${variant}`,
                    "utils.cleanBuildOutputFolder",
                    `standalone.${variant}.prepare`,
                    `standalone.${variant}.package.${platform}`
                )
            );
        }
    }

    // serve
    gulp.task(
        "serve." + variant,
        gulp.series("build.prepare.dev", "html.dev", () => serveHTML({ version: variant }))
    );
}

// Deploying!
gulp.task(
    "deploy.staging",
    gulp.series("utils.requireCleanWorkingTree", "build.web-shapezio-beta", "ftp.upload.staging")
);
gulp.task(
    "deploy.prod",
    gulp.series("utils.requireCleanWorkingTree", "build.web-shapezio", "ftp.upload.prod")
);

// Default task (dev, localhost)
gulp.task("default", gulp.series("serve.standalone-steam"));
