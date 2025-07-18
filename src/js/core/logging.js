import { globalConfig } from "../core/config";

/*
Logging functions
- To be extended
*/

/**
 * Base logger class
 */
class Logger {
    constructor(context) {
        this.context = context;
    }

    debug(...args) {
        globalDebug(this.context, ...args);
    }

    log(...args) {
        globalLog(this.context, ...args);
    }

    warn(...args) {
        globalWarn(this.context, ...args);
    }

    error(...args) {
        globalError(this.context, ...args);
    }
}

export function createLogger(context) {
    return new Logger(context);
}

export function globalDebug(context, ...args) {
    if (G_IS_DEV) {
        logInternal(context, console.log, prepareArgsForLogging(args));
    }
}

export function globalLog(context, ...args) {
    logInternal(context, console.log, prepareArgsForLogging(args));
}

export function globalWarn(context, ...args) {
    logInternal(context, console.warn, prepareArgsForLogging(args));
}

export function globalError(context, ...args) {
    args = prepareArgsForLogging(args);
    logInternal(context, console.error, args);
}

function prepareArgsForLogging(args) {
    let result = [];
    for (let i = 0; i < args.length; ++i) {
        result.push(args[i]);
    }
    return result;
}

export function logSection(name, color) {
    while (name.length <= 14) {
        name = " " + name + " ";
    }
    name = name.padEnd(19, " ");

    const lineCss =
        "letter-spacing: -3px; color: " + color + "; font-size: 6px; background: #eee; color: #eee;";
    const line = "%c----------------------------";
    console.log("\n" + line + " %c" + name + " " + line + "\n", lineCss, "color: " + color, lineCss);
}

function extractHandleContext(handle) {
    let context = handle || "unknown";
    if (handle && handle.constructor && handle.constructor.name) {
        context = handle.constructor.name;
        if (context === "String") {
            context = handle;
        }
    }

    if (handle && handle.name) {
        context = handle.name;
    }
    return context + "";
}

function logInternal(handle, consoleMethod, args) {
    const context = extractHandleContext(handle).padEnd(20, " ");
    const labelColor = handle && handle.LOG_LABEL_COLOR ? handle.LOG_LABEL_COLOR : "#aaa";

    if (G_IS_DEV && globalConfig.debug.logTimestamps) {
        const timestamp = "⏱ %c" + (Math.floor(performance.now()) + "").padEnd(6, " ") + "";
        consoleMethod.call(
            console,
            timestamp + " %c" + context,
            "color: #7f7;",
            "color: " + labelColor + ";",
            ...args
        );
    } else {
        // if (G_IS_DEV && !globalConfig.debug.disableLoggingLogSources) {
        consoleMethod.call(console, "%c" + context, "color: " + labelColor, ...args);
        // } else {
        // consoleMethod.call(console, ...args);
        // }
    }
}
