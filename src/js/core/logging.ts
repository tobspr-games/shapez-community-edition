export class Logger {
    /**
     * A simple {@link console} wrapper that retains the location of log calls.
     * @param context Label to be displayed in each log message
     * @param color Optional label color override
     * @param debug Whether to log {@link Logger.debug} messages
     */
    constructor(context: string, color = "#aaa", debug = G_IS_DEV) {
        const label = "%c" + context.padEnd(20, " ");
        const style = `color: ${color}`;

        if (debug) {
            this.debug = console.debug.bind(console, label, style);
        }

        this.log = console.log.bind(console, label, style);
        this.warn = console.warn.bind(console, label, style);
        this.error = console.error.bind(console, label, style);
    }

    // @ts-expect-error parameters are actually used
    debug(...args: unknown[]) {}
    // @ts-expect-error same
    log(...args: unknown[]) {}
    // @ts-expect-error same
    warn(...args: unknown[]) {}
    // @ts-expect-error same
    error(...args: unknown[]) {}
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
