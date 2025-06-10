import { BrowserWindow, IpcMainInvokeEvent, ipcMain } from "electron";
import { FsJob, FsJobHandler } from "./fsjob.js";
import { ModLoader } from "./mods/loader.js";
import { SavesStorage } from "./storage/saves.js";

export class IpcHandler {
    private readonly savesHandler = new FsJobHandler("saves", new SavesStorage());
    private readonly modLoader: ModLoader;

    constructor(modLoader: ModLoader) {
        this.modLoader = modLoader;
    }

    install(window: BrowserWindow) {
        ipcMain.handle("fs-job", this.handleFsJob.bind(this));
        ipcMain.handle("get-mods", this.getMods.bind(this));
        ipcMain.handle("set-fullscreen", this.setFullscreen.bind(this, window));

        // Not implemented
        // ipcMain.handle("open-mods-folder", ...)
    }

    private async handleFsJob(_event: IpcMainInvokeEvent, job: FsJob<unknown>) {
        if (job.id !== "saves") {
            throw new Error("Storages other than saves/ are not implemented yet");
        }

        return this.savesHandler.handleJob(job);
    }

    private async getMods() {
        // TODO: Split mod reloads into a different IPC request
        await this.modLoader.loadMods();
        return this.modLoader.getAllMods();
    }

    private setFullscreen(window: BrowserWindow, _event: IpcMainInvokeEvent, flag: boolean) {
        if (window.isFullScreen() != flag) {
            window.setFullScreen(flag);
        }
    }
}
