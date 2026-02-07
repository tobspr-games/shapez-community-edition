import gulp from "gulp";
import path from "node:path/posix";
import { buildFolder, generatedCodeFolder } from "./config.js";

import gulpAudiosprite from "gulp-audiosprite";
import gulpCache from "gulp-cache";
import gulpClean from "gulp-clean";
import gulpFluentFfmpeg from "gulp-fluent-ffmpeg";
import gulpPlumber from "gulp-plumber";

// Gather some basic infos
const soundsDir = path.join("..", "res_raw", "sounds");
const builtSoundsDir = path.join("..", "res_built", "sounds");

export function clear() {
    return gulp.src(builtSoundsDir, { read: false, allowEmpty: true }).pipe(gulpClean({ force: true }));
}

const filters = ["volume=0.2"];

const fileCache = new gulpCache.Cache({
    cacheDirName: "shapezio-precompiled-sounds",
});

function getFileCacheValue(file) {
    const { _isVinyl, base, cwd, contents, history, stat, path } = file;
    const encodedContents = Buffer.from(contents).toString("base64");
    return { _isVinyl, base, cwd, contents: encodedContents, history, stat, path };
}

// Encodes the game music
export function music() {
    return gulp
        .src([path.join(soundsDir, "music", "**", "*.wav"), path.join(soundsDir, "music", "**", "*.mp3")])
        .pipe(gulpPlumber())
        .pipe(
            gulpCache(
                gulpFluentFfmpeg("mp3", function (cmd) {
                    return cmd
                        .audioBitrate(48)
                        .audioChannels(1)
                        .audioFrequency(22050)
                        .audioCodec("libmp3lame")
                        .audioFilters(["volume=0.15"]);
                }),
                {
                    name: "music",
                    fileCache,
                    value: getFileCacheValue,
                }
            )
        )
        .pipe(gulp.dest(path.join(builtSoundsDir, "music")));
}

// Encodes the game music in high quality for the standalone
export function musicHQ() {
    return gulp
        .src([path.join(soundsDir, "music", "**", "*.wav"), path.join(soundsDir, "music", "**", "*.mp3")])
        .pipe(gulpPlumber())
        .pipe(
            gulpCache(
                gulpFluentFfmpeg("mp3", function (cmd) {
                    return cmd
                        .audioBitrate(256)
                        .audioChannels(2)
                        .audioFrequency(44100)
                        .audioCodec("libmp3lame")
                        .audioFilters(["volume=0.15"]);
                }),
                {
                    name: "music-high-quality",
                    fileCache,
                    value: getFileCacheValue,
                }
            )
        )
        .pipe(gulp.dest(path.join(builtSoundsDir, "music")));
}

// Encodes the ui sounds
export function sfxGenerateSprites() {
    return gulp
        .src([path.join(soundsDir, "sfx", "**", "*.wav"), path.join(soundsDir, "sfx", "**", "*.mp3")])
        .pipe(gulpPlumber())
        .pipe(
            gulpAudiosprite({
                format: "howler",
                output: "sfx",
                gap: 0.1,
                export: "mp3",
            })
        )
        .pipe(gulp.dest(path.join(builtSoundsDir)));
}
export function sfxOptimize() {
    return gulp
        .src([path.join(builtSoundsDir, "sfx.mp3")])
        .pipe(gulpPlumber())
        .pipe(
            gulpFluentFfmpeg("mp3", function (cmd) {
                return cmd
                    .audioBitrate(128)
                    .audioChannels(1)
                    .audioFrequency(22050)
                    .audioCodec("libmp3lame")
                    .audioFilters(filters);
            })
        )
        .pipe(gulp.dest(path.join(builtSoundsDir)));
}
export function sfxCopyAtlas() {
    return gulp.src([path.join(builtSoundsDir, "sfx.json")]).pipe(gulp.dest(generatedCodeFolder));
}

export const sfx = gulp.series(sfxGenerateSprites, sfxOptimize, sfxCopyAtlas);

export function copy() {
    return gulp
        .src(path.join(builtSoundsDir, "**", "*.mp3"))
        .pipe(gulpPlumber())
        .pipe(gulp.dest(path.join(buildFolder, "res", "sounds")));
}

export const buildall = gulp.parallel(music, sfx);
export const buildallHQ = gulp.parallel(musicHQ, sfx);

export const fullbuild = gulp.series(clear, buildall, copy);
export const fullbuildHQ = gulp.series(clear, buildallHQ, copy);
export const dev = gulp.series(buildall, copy);
