import { app } from "electron";
import path from "node:path";

const disabledFeatures = ["HardwareMediaKeyHandling"];
app.commandLine.appendSwitch("disable-features", disabledFeatures.join(","));

export const defaultWindowTitle = "shapez CE";
app.setName("shapez-ce");

// This variable should be used to avoid situations where the app name
// wasn't set yet.
export const userData = app.getPath("userData");
export const executableDir = path.dirname(app.getPath("exe"));

export const pageUrl = app.isPackaged
    ? new URL("../index.html", import.meta.url).href
    : "http://localhost:3005/";

export const switches = {
    dev: app.commandLine.hasSwitch("dev"),
    hideDevtools: app.commandLine.hasSwitch("hide-devtools"),
    safeMode: app.commandLine.hasSwitch("safe-mode"),
};
