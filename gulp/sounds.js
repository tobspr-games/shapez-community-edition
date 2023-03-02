import path from "path";
import audiosprite from "gulp-audiosprite";

import gulpClean from "gulp-clean";
import gulpCache from "gulp-cache";
import gulpPlumber from "gulp-plumber";
import gulpFluentFfmpeg from "gulp-fluent-ffmpeg";

export default function gulptasksSounds(gulp, buildFolder) {
    // Gather some basic infos
    const soundsDir = path.resolve("..", "res_raw", "sounds");
    const builtSoundsDir = path.resolve("..", "res_built", "sounds");

    gulp.task("sounds.clear", () => {
        return gulp.src(builtSoundsDir, { read: false, allowEmpty: true }).pipe(gulpClean({ force: true }));
    });

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
    gulp.task("sounds.music", () => {
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
    });

    // Encodes the game music in high quality for the standalone
    gulp.task("sounds.musicHQ", () => {
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
    });

    // Encodes the ui sounds
    gulp.task("sounds.sfxGenerateSprites", () => {
        return gulp
            .src([path.join(soundsDir, "sfx", "**", "*.wav"), path.join(soundsDir, "sfx", "**", "*.mp3")])
            .pipe(gulpPlumber())
            .pipe(
                audiosprite({
                    format: "howler",
                    output: "sfx",
                    gap: 0.1,
                    export: "mp3",
                })
            )
            .pipe(gulp.dest(path.join(builtSoundsDir)));
    });
    gulp.task("sounds.sfxOptimize", () => {
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
    });
    gulp.task("sounds.sfxCopyAtlas", () => {
        return gulp
            .src([path.join(builtSoundsDir, "sfx.json")])
            .pipe(gulp.dest(path.resolve("..", "src", "js", "built-temp")));
    });

    gulp.task(
        "sounds.sfx",
        gulp.series("sounds.sfxGenerateSprites", "sounds.sfxOptimize", "sounds.sfxCopyAtlas")
    );

    gulp.task("sounds.copy", () => {
        return gulp
            .src(path.join(builtSoundsDir, "**", "*.mp3"))
            .pipe(gulpPlumber())
            .pipe(gulp.dest(path.join(buildFolder, "res", "sounds")));
    });

    gulp.task("sounds.buildall", gulp.parallel("sounds.music", "sounds.sfx"));
    gulp.task("sounds.buildallHQ", gulp.parallel("sounds.musicHQ", "sounds.sfx"));

    gulp.task("sounds.fullbuild", gulp.series("sounds.clear", "sounds.buildall", "sounds.copy"));
    gulp.task("sounds.fullbuildHQ", gulp.series("sounds.clear", "sounds.buildallHQ", "sounds.copy"));
    gulp.task("sounds.dev", gulp.series("sounds.buildall", "sounds.copy"));
}
