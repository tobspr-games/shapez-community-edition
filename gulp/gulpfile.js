import gulp from "gulp";
import * as tasks from "./tasks.js";

/**
 * @typedef {import("gulp").TaskFunction} TaskFunction
 * @typedef {TaskFunction | { [k: string]: Tasks }} Tasks
 */

/**
 * @param {Tasks} tasks
 * @param {string=} prefix
 */
function register(tasks, prefix) {
    if (tasks instanceof Function) {
        gulp.task(prefix, tasks);
        return;
    }
    for (const [k, v] of Object.entries(tasks)) {
        register(v, prefix == null ? k : `${prefix}.${k}`);
    }
}

register(tasks);
