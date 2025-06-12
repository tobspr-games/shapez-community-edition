import path from "path/posix";
import gulp from "gulp";
import { buildFolder } from "./config.js";

import gulpClean from "gulp-clean";
import gulpCache from "gulp-cache";
import gulpPlumber from "gulp-plumber";
import gulpFluentFfmpeg from "gulp-fluent-ffmpeg";

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
        .src([path.join(soundsDir, "music", "**", "*.wav"), path.join(soundsDir, "music", "**", "*.mp3"), path.join(soundsDir, "music", "**", "*.ogg")])
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

// copies the ui sounds
export function sfxCopySounds() {
    return gulp
        .src([path.join(soundsDir, "sfx", "**", "*.wav"), path.join(soundsDir, "sfx", "**", "*.mp3")])
        .pipe(gulpPlumber())
        .pipe(gulp.dest(path.join(builtSoundsDir, "sfx")));
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

export const sfx = gulp.series(sfxCopySounds, sfxOptimize);

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
