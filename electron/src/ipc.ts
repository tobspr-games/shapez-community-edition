import { BrowserWindow, IpcMainInvokeEvent, ipcMain } from "electron";
import { FsJob, FsJobHandler } from "./fsjob.js";
import { ModsHandler } from "./mods.js";

export class IpcHandler {
    private readonly fsJob: FsJobHandler;
    private readonly mods: ModsHandler;

    constructor(fsJob: FsJobHandler, mods: ModsHandler) {
        this.fsJob = fsJob;
        this.mods = mods;
    }

    install(window: BrowserWindow) {
        ipcMain.handle("fs-job", this.handleFsJob.bind(this));
        ipcMain.handle("get-mods", this.getMods.bind(this));
        ipcMain.handle("set-fullscreen", this.setFullscreen.bind(this, window));

        // Not implemented
        // ipcMain.handle("open-mods-folder", ...)
    }

    private handleFsJob(_event: IpcMainInvokeEvent, job: FsJob) {
        return this.fsJob.handleJob(job);
    }

    private getMods() {
        return this.mods.getMods();
    }

    private setFullscreen(window: BrowserWindow, _event: IpcMainInvokeEvent, flag: boolean) {
        if (window.isFullScreen() != flag) {
            window.setFullScreen(flag);
        }
    }
}
