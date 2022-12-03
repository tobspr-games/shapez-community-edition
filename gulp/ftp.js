import path from "path/posix";
import fs from "fs";

import { getRevision, getVersion } from "./buildutils.js";

import gulpRename from "gulp-rename";
import gulpSftp from "gulp-sftp";

export default function gulptasksFTP(gulp, buildFolder) {
    const commitHash = getRevision();

    const additionalFolder = path.join("additional_build_files");

    const additionalFiles = [
        path.join(additionalFolder, "*"),
        path.join(additionalFolder, "*.*"),
        path.join(additionalFolder, ".*"),
    ];

    const credentials = {
        alpha: {
            host: process.env.SHAPEZ_CLI_SERVER_HOST,
            user: process.env.SHAPEZ_CLI_ALPHA_FTP_USER,
            pass: process.env.SHAPEZ_CLI_ALPHA_FTP_PW,
        },
        staging: {
            host: process.env.SHAPEZ_CLI_SERVER_HOST,
            user: process.env.SHAPEZ_CLI_STAGING_FTP_USER,
            pass: process.env.SHAPEZ_CLI_STAGING_FTP_PW,
        },
        prod: {
            host: process.env.SHAPEZ_CLI_SERVER_HOST,
            user: process.env.SHAPEZ_CLI_LIVE_FTP_USER,
            pass: process.env.SHAPEZ_CLI_LIVE_FTP_PW,
        },
    };

    // Write the "commit.txt" file
    gulp.task("ftp.writeVersion", cb => {
        fs.writeFileSync(
            path.join(buildFolder, "version.json"),
            JSON.stringify(
                {
                    commit: getRevision(),
                    appVersion: getVersion(),
                    buildTime: new Date().getTime(),
                },
                null,
                4
            )
        );
        cb();
    });

    const gameSrcGlobs = [
        path.join(buildFolder, "**/*.*"),
        path.join(buildFolder, "**/.*"),
        path.join(buildFolder, "**/*"),
        path.join(buildFolder, "!**/index.html"),
    ];

    for (const deployEnv of ["alpha", "prod", "staging"]) {
        const deployCredentials = credentials[deployEnv];

        gulp.task(`ftp.upload.${deployEnv}.game`, () => {
            return gulp
                .src(gameSrcGlobs, { base: buildFolder })
                .pipe(
                    gulpRename(pth => {
                        pth.dirname = path.join("v", commitHash, pth.dirname);
                    })
                )
                .pipe(gulpSftp(deployCredentials));
        });

        gulp.task(`ftp.upload.${deployEnv}.indexHtml`, () => {
            return gulp
                .src([path.join(buildFolder, "index.html"), path.join(buildFolder, "version.json")], {
                    base: buildFolder,
                })
                .pipe(gulpSftp(deployCredentials));
        });

        gulp.task(`ftp.upload.${deployEnv}.additionalFiles`, () => {
            return gulp
                .src(additionalFiles, { base: additionalFolder }) //
                .pipe(gulpSftp(deployCredentials));
        });

        gulp.task(
            `ftp.upload.${deployEnv}`,
            gulp.series(
                "ftp.writeVersion",
                `ftp.upload.${deployEnv}.game`,
                `ftp.upload.${deployEnv}.indexHtml`,
                `ftp.upload.${deployEnv}.additionalFiles`
            )
        );
    }
}
