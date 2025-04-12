import { BrowserWindow, app, shell } from "electron";
import path from "path";
import { defaultWindowTitle, pageUrl, switches } from "./config.js";
import { FsJobHandler } from "./fsjob.js";
import { IpcHandler } from "./ipc.js";
import { ModLoader } from "./mods/loader.js";
import { ModProtocolHandler } from "./mods/protocol_handler.js";

let win: BrowserWindow | null = null;

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (win?.isMinimized()) {
            win.restore();
        }

        win?.focus();
    });
}

// TODO: Implement a redirector/advanced storage system
// Let mods have own data directories with easy access and
// split savegames/configs - only implement backups and gzip
// files if requested. Perhaps, use streaming to make large
// transfers less "blocking"
const fsJob = new FsJobHandler("saves");
const modLoader = new ModLoader();
const modProtocol = new ModProtocolHandler(modLoader);
const ipc = new IpcHandler(fsJob, modLoader);

function createWindow() {
    // The protocol can only be handled after "ready" event
    modProtocol.install();

    const window = new BrowserWindow({
        minWidth: 800,
        minHeight: 600,
        useContentSize: true,
        autoHideMenuBar: !switches.dev,
        show: false,
        title: defaultWindowTitle,
        webPreferences: {
            preload: path.join(import.meta.dirname, "../preload.cjs"),
        },
    });

    win = window;

    if (!switches.dev) {
        window.removeMenu();
    }

    window.on("ready-to-show", () => {
        window.show();

        if (switches.dev && !switches.hideDevtools) {
            window.webContents.openDevTools();
        }
    });

    ipc.install(window);
    window.loadURL(pageUrl);

    // Redirect any kind of main frame navigation to external applications
    window.webContents.on("will-navigate", (ev, url) => {
        if (url === window.webContents.getURL()) {
            // Avoid handling reloads externally
            return;
        }

        ev.preventDefault();
        openExternalUrl(url);
    });

    // Also redirect window.open
    window.webContents.setWindowOpenHandler(({ url }) => {
        openExternalUrl(url);
        return { action: "deny" };
    });
}

function openExternalUrl(urlString: string) {
    try {
        const url = new URL(urlString);

        // TODO: Let the user explicitly allow other protocols
        if (["http:", "https:"].includes(url.protocol)) {
            shell.openExternal(urlString);
        }
    } catch {
        // Ignore invalid URLs
    }
}

app.on("ready", createWindow);
app.on("window-all-closed", () => {
    app.quit();
});
