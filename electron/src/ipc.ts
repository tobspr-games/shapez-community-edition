import { BrowserWindow, IpcMainInvokeEvent, ipcMain } from "electron";
import { FsJob, FsJobHandler } from "./fsjob.js";
import { ModLoader } from "./mods/loader.js";
import { SavesStorage } from "./storage/saves.js";

export class IpcHandler {
    private readonly modLoader: ModLoader;
    private readonly fsHandlers = new Map<string, FsJobHandler<unknown>>()

    constructor(modLoader: ModLoader) {
        this.modLoader = modLoader;
        this.fsHandlers.set("saves", new FsJobHandler("saves", new SavesStorage()));
    }

    install(window: BrowserWindow) {
        ipcMain.handle("fs-job", this.handleFsJob.bind(this));
        ipcMain.handle("get-mods", this.getMods.bind(this));
        ipcMain.handle("set-fullscreen", this.setFullscreen.bind(this, window));

        // Not implemented
        // ipcMain.handle("open-mods-folder", ...)
    }

    private handleFsJob(_event: IpcMainInvokeEvent, job: FsJob<unknown>) {
        const handler = this.fsHandlers.get(job.id)
        if (typeof handler === 'undefined') {
            throw Error(`unknown id: ${job.id}`)
        }

        return handler.handleJob(job)
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
