import asyncLock from "async-lock";
import { BrowserWindow, Menu, MenuItem, app, dialog, ipcMain, session, shell } from "electron";
import windowStateKeeper from "electron-window-state";
import * as fs from "fs";
import * as path from "path";

// Disable hardware key handling, i.e. being able to pause/resume the game music
// with hardware keys
app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling");

const isDev = app.commandLine.hasSwitch("dev");
const safeMode = app.commandLine.hasSwitch("safe-mode");
const externalMod = app.commandLine.getSwitchValue("load-mod");

app.setName("shapez-ce");
const userData = app.getPath("userData");

const storePath = path.join(userData, "saves");
const modsPath = path.join(userData, "mods");

await fs.promises.mkdir(storePath, { recursive: true });
await fs.promises.mkdir(modsPath, { recursive: true });

/** @type {BrowserWindow} */
let win = null;
let menu = null;

function createWindow() {
    let faviconExtension = ".png";
    if (process.platform === "win32") {
        faviconExtension = ".ico";
    }

    const mainWindowState = windowStateKeeper({
        defaultWidth: 1000,
        defaultHeight: 800,
    });

    win = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        show: false,
        backgroundColor: "#222428",
        useContentSize: false,
        minWidth: 800,
        minHeight: 600,
        title: "shapez",
        icon: path.join(import.meta.dirname, "../favicon" + faviconExtension),
        // fullscreen: true,
        autoHideMenuBar: !isDev,
        webPreferences: {
            preload: path.join(import.meta.dirname, "../preload.cjs"),
        },
    });

    mainWindowState.manage(win);

    if (!app.isPackaged) {
        win.loadURL("http://localhost:3005");
    } else {
        win.loadURL(new URL("../index.html", import.meta.url).href);
    }
    win.webContents.session.clearCache();
    win.webContents.session.clearStorageData();

    ////// SECURITY

    // Disable permission requests
    win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(false);
    });
    session.fromPartition("default").setPermissionRequestHandler((webContents, permission, callback) => {
        callback(false);
    });

    app.on("web-contents-created", (event, contents) => {
        // Disable vewbiew
        contents.on("will-attach-webview", event => {
            event.preventDefault();
        });
        // Disable navigation
        contents.on("will-navigate", event => {
            event.preventDefault();
        });
    });

    win.webContents.on("will-redirect", (contentsEvent, navigationUrl) => {
        // Log and prevent the app from redirecting to a new page
        console.error(
            `The application tried to redirect to the following address: '${navigationUrl}'. This attempt was blocked.`
        );
        contentsEvent.preventDefault();
    });

    //// END SECURITY

    win.webContents.on("will-navigate", (event, pth) => {
        event.preventDefault();

        if (pth.startsWith("https://")) {
            shell.openExternal(pth);
        }
    });

    win.on("closed", () => {
        console.log("Window closed");
        win = null;
    });

    if (isDev) {
        menu = new Menu();

        win.webContents.toggleDevTools();

        const mainItem = new MenuItem({
            label: "Toggle Dev Tools",
            click: () => win.webContents.toggleDevTools(),
            accelerator: "F12",
        });
        menu.append(mainItem);

        const reloadItem = new MenuItem({
            label: "Reload",
            click: () => win.reload(),
            accelerator: "F5",
        });
        menu.append(reloadItem);

        const fullscreenItem = new MenuItem({
            label: "Fullscreen",
            click: () => win.setFullScreen(!win.isFullScreen()),
            accelerator: "F11",
        });
        menu.append(fullscreenItem);

        const mainMenu = new Menu();
        mainMenu.append(
            new MenuItem({
                label: "shapez.io",
                submenu: menu,
            })
        );

        Menu.setApplicationMenu(mainMenu);
    } else {
        Menu.setApplicationMenu(null);
    }

    win.once("ready-to-show", () => {
        win.show();
        win.focus();
    });
}

if (!app.requestSingleInstanceLock()) {
    app.exit(0);
} else {
    app.on("second-instance", () => {
        // Someone tried to run a second instance, we should focus
        if (win) {
            if (win.isMinimized()) {
                win.restore();
            }
            win.focus();
        }
    });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
    console.log("All windows closed");
    app.quit();
});

ipcMain.on("set-fullscreen", (event, flag) => {
    win.setFullScreen(flag);
});

ipcMain.on("exit-app", () => {
    win.close();
    app.quit();
});

let renameCounter = 1;

const fileLock = new asyncLock({
    timeout: 30000,
    maxPending: 1000,
});

function niceFileName(filename) {
    return filename.replace(storePath, "@");
}

async function writeFileSafe(filename, contents) {
    ++renameCounter;
    const prefix = "[ " + renameCounter + ":" + niceFileName(filename) + " ] ";
    const transactionId = String(new Date().getTime()) + "." + renameCounter;

    if (fileLock.isBusy()) {
        console.warn(prefix, "Concurrent write process on", filename);
    }

    fileLock.acquire(filename, async () => {
        console.log(prefix, "Starting write on", niceFileName(filename), "in transaction", transactionId);

        if (!fs.existsSync(filename)) {
            // this one is easy
            console.log(prefix, "Writing file instantly because it does not exist:", niceFileName(filename));
            await fs.promises.writeFile(filename, contents, "utf8");
            return;
        }

        // first, write a temporary file (.tmp-XXX)
        const tempName = filename + ".tmp-" + transactionId;
        console.log(prefix, "Writing temporary file", niceFileName(tempName));
        await fs.promises.writeFile(tempName, contents, "utf8");

        // now, rename the original file to (.backup-XXX)
        const oldTemporaryName = filename + ".backup-" + transactionId;
        console.log(
            prefix,
            "Renaming old file",
            niceFileName(filename),
            "to",
            niceFileName(oldTemporaryName)
        );
        await fs.promises.rename(filename, oldTemporaryName);

        // now, rename the temporary file (.tmp-XXX) to the target
        console.log(
            prefix,
            "Renaming the temporary file",
            niceFileName(tempName),
            "to the original",
            niceFileName(filename)
        );
        await fs.promises.rename(tempName, filename);

        // we are done now, try to create a backup, but don't fail if the backup fails
        try {
            // check if there is an old backup file
            const backupFileName = filename + ".backup";
            if (fs.existsSync(backupFileName)) {
                console.log(prefix, "Deleting old backup file", niceFileName(backupFileName));
                // delete the old backup
                await fs.promises.unlink(backupFileName);
            }

            // rename the old file to the new backup file
            console.log(prefix, "Moving", niceFileName(oldTemporaryName), "to the backup file location");
            await fs.promises.rename(oldTemporaryName, backupFileName);
        } catch (ex) {
            console.error(prefix, "Failed to switch backup files:", ex);
        }
    });
}

ipcMain.handle("fs-job", async (event, job) => {
    const filenameSafe = job.filename.replace(/[^a-z.\-_0-9]/gi, "_");
    const fname = path.join(storePath, filenameSafe);
    switch (job.type) {
        case "read": {
            if (!fs.existsSync(fname)) {
                // Special FILE_NOT_FOUND error code
                return { error: "file_not_found" };
            }
            return await fs.promises.readFile(fname, "utf8");
        }
        case "write": {
            await writeFileSafe(fname, job.contents);
            return job.contents;
        }

        case "delete": {
            await fs.promises.unlink(fname);
            return;
        }

        default:
            throw new Error("Unknown fs job: " + job.type);
    }
});

ipcMain.handle("open-mods-folder", async () => {
    shell.openPath(modsPath);
});

console.log("Loading mods ...");

function loadMods() {
    if (safeMode) {
        console.log("Safe Mode enabled for mods, skipping mod search");
    }
    console.log("Loading mods from", modsPath);
    let modFiles = safeMode
        ? []
        : fs
              .readdirSync(modsPath)
              .filter(filename => filename.endsWith(".js"))
              .map(filename => path.join(modsPath, filename));

    if (externalMod) {
        console.log("Adding external mod source:", externalMod);
        const externalModPaths = externalMod.split(",");
        modFiles = modFiles.concat(externalModPaths);
    }

    return modFiles.map(filename => fs.readFileSync(filename, "utf8"));
}

let mods = [];
try {
    mods = loadMods();
    console.log("Loaded", mods.length, "mods");
} catch (ex) {
    console.error("Failed to load mods");
    dialog.showErrorBox("Failed to load mods:", ex);
}

ipcMain.handle("get-mods", async () => {
    return mods;
});
