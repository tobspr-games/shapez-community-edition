import { BrowserWindow, app, shell } from "electron";
import path from "path";
import { pageUrl, switches } from "./config.js";
import { FsJobHandler } from "./fsjob.js";
import { IpcHandler } from "./ipc.js";
import { ModsHandler } from "./mods.js";

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
const mods = new ModsHandler();
const ipc = new IpcHandler(fsJob, mods);

function createWindow() {
    win = new BrowserWindow({
        minWidth: 800,
        minHeight: 600,
        useContentSize: true,
        autoHideMenuBar: !switches.dev,
        show: false,
        webPreferences: {
            preload: path.join(import.meta.dirname, "../preload.cjs"),
        },
    });

    if (!switches.dev) {
        win.removeMenu();
    }

    win.on("ready-to-show", () => {
        win.show();

        if (switches.dev && !switches.hideDevtools) {
            win.webContents.openDevTools();
        }
    });

    ipc.install(win);
    win.loadURL(pageUrl);

    // Redirect any kind of main frame navigation to external applications
    win.webContents.on("will-navigate", (ev, url) => {
        if (url === win.webContents.getURL()) {
            // Avoid handling reloads externally
            return;
        }

        ev.preventDefault();
        openExternalUrl(url);
    });

    // Also redirect window.open
    win.webContents.setWindowOpenHandler(({ url }) => {
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

await mods.reload();

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    app.quit();
});
