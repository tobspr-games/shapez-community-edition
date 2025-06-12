import gulp from "gulp";
import path from "path/posix";
import { buildFolder } from "./config.js";


import gulpClean from "gulp-clean";
import gulpFluentFfmpeg from "gulp-fluent-ffmpeg";
import gulpPlumber from "gulp-plumber";

// Gather some basic infos
const soundsDir = path.join("..", "res_raw", "sounds");
const builtSoundsDir = path.join("..", "res_built", "sounds");

export function clear() {
    return gulp.src(builtSoundsDir, { read: false, allowEmpty: true }).pipe(gulpClean({ force: true }));
}

export function musicCopy() {
    return gulp
        .src(path.join(soundsDir, "music", "**", "*.ogg"))
        .pipe(gulpPlumber())
        .pipe(gulp.dest(path.join(builtSoundsDir, "music")));
}

export function sfxOptimize() {
    return gulp
        .src([path.join(soundsDir, "sfx", "**", "*.wav"), path.join(soundsDir, "sfx", "**", "*.mp3")])
        .pipe(gulpPlumber())
        .pipe(gulpFluentFfmpeg("ogg"))
        .pipe(gulp.dest(path.join(builtSoundsDir)));
}

export const music = gulp.series(musicCopy);
export const sfx = gulp.series(sfxOptimize);

export function copy() {
    return gulp
        .src([path.join(builtSoundsDir, "**", "*.mp3"), path.join(builtSoundsDir, "**", "*.ogg")])
        .pipe(gulpPlumber())
        .pipe(gulp.dest(path.join(buildFolder, "res", "sounds")));
}

export const buildall = gulp.parallel(musicCopy, sfx);
export const buildallHQ = gulp.parallel(musicCopy, sfx);

export const fullbuild = gulp.series(clear, buildall, copy);
export const fullbuildHQ = gulp.series(clear, buildallHQ, copy);
export const dev = gulp.series(buildall, copy);
