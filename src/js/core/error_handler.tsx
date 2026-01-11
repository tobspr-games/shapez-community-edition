import { MODS } from "@/mods/modloader";
import { T } from "@/translations";
import { BUILD_OPTIONS } from "./globals";
import { removeAllChildren } from "./utils";

export class ErrorHandler {
    isActive = true;

    constructor() {
        window.addEventListener("error", this.onError.bind(this));
        window.addEventListener("unhandledrejection", this.onUnhandledRejection.bind(this));
    }

    private onError(ev: ErrorEvent) {
        if (!this.isActive) {
            return;
        }

        // Don't trigger more than once
        this.isActive = false;

        const screen = new ErrorScreen(ev.error, ev.filename, ev.lineno, ev.colno);
        screen.show();
    }

    private onUnhandledRejection(ev: PromiseRejectionEvent) {
        const error = ev.reason instanceof Error ? ev.reason : new Error(ev.reason);

        // Avoid logging the error twice
        ev.preventDefault();

        // Turn the unhandled rejection into a regular error event
        throw new Error("Unhandled Promise rejection", { cause: error });
    }
}

export class ErrorScreen {
    private error: Error;
    private file?: string;
    private line?: number;
    private column?: number;

    constructor(error: Error, file?: string, line?: number, column?: number) {
        this.error = error;
        this.file = file;
        this.line = line;
        this.column = column;
    }

    show() {
        // Set the global to stop future callback handlers
        window.APP_ERROR_OCCURED = true;

        removeAllChildren(document.body);
        document.body.id = "errorHandler";
        document.body.className = "";

        const layout = this.createLayout();
        if (Array.isArray(layout)) {
            document.body.append(...layout);
        } else {
            document.body.append(layout);
        }
    }

    private createLayout(): HTMLElement | HTMLElement[] {
        const btnCopy = <button>{T.errorHandler.actions.copy}</button>;
        const btnRestart = <button>{T.errorHandler.actions.restart}</button>;

        btnCopy.addEventListener("click", this.copyErrorLog.bind(this));
        btnRestart.addEventListener("click", this.restart.bind(this));

        return (
            <>
                <div class="header">
                    <h1>{T.errorHandler.title}</h1>
                    <div class="source">{this.source}</div>
                </div>
                <pre class="stackTrace">{this.recursiveStack}</pre>
                <div class="loadedMods">
                    {T.errorHandler.labels.loadedMods}
                    <pre>{this.loadedMods}</pre>
                </div>
                <div class="buildInformation">
                    {T.errorHandler.labels.buildInformation}
                    <pre>{this.buildInformation}</pre>
                </div>
                <div class="actions">
                    {btnCopy}
                    {btnRestart}
                </div>
            </>
        );
    }

    private copyErrorLog(ev: MouseEvent) {
        let log = `shapez Error Log - ${new Date().toISOString()}\n\n`;

        log += this.recursiveStack;
        log += `\n\nLoaded Mods:\n${this.loadedMods}`;
        log += `\n\nBuild Information:\n${this.buildInformation}`;

        navigator.clipboard.writeText(log);

        if (ev.target instanceof HTMLButtonElement) {
            ev.target.innerText = T.errorHandler.actions.copyDone;
            ev.target.classList.add("success");
        }
    }

    private restart() {
        // performRestart may not be available yet
        location.reload();
    }

    private get source(): string {
        return `${this.file} (${this.line}:${this.column})`;
    }

    private get recursiveStack(): string {
        // Follow the error cause chain
        let current = this.error;
        let stack = current.stack;

        while (current.cause instanceof Error) {
            current = current.cause;
            stack += `\nCaused by: ${current.stack}`;
        }

        return stack;
    }

    private get loadedMods(): string {
        const mods: string[] = [];
        const activeMods = MODS.activeMods;

        for (const mod of MODS.allMods) {
            const isActive = activeMods.includes(mod);
            const prefix = isActive ? "*" : "";

            const id = mod.mod.id;
            const version = mod.mod.metadata.version;

            mods.push(`${prefix}${id}@${version} (${mod.source})`);
        }

        return mods.join("\n");
    }

    private get buildInformation(): string {
        const info: string[] = [];

        for (const [key, value] of Object.entries(BUILD_OPTIONS)) {
            info.push(`${key}: ${JSON.stringify(value)}`);
        }

        return info.join("\n");
    }
}
