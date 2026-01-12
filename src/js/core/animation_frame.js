import { Signal } from "./signal";

import { Logger } from "./logging";
const logger = new Logger("animation_frame");

const maxDtMs = 1000;
const resetDtMs = 16;

export class AnimationFrame {
    constructor() {
        /** @type {Signal<[number]>} */
        this.frameEmitted = new Signal();
        /** @type {Signal<[number]>} */
        this.bgFrameEmitted = new Signal();

        this.lastTime = performance.now();
        this.bgLastTime = performance.now();

        this.boundMethod = this.handleAnimationFrame.bind(this);

        this.backgroundWorker = new Worker(
            new URL("../webworkers/background_animation_frame_emittter", import.meta.url)
        );
        this.backgroundWorker.addEventListener("error", err => {
            logger.error("Error in background fps worker:", err);
        });
        this.backgroundWorker.addEventListener("message", this.handleBackgroundTick.bind(this));
    }

    handleBackgroundTick() {
        const time = performance.now();

        let dt = time - this.bgLastTime;

        if (dt > maxDtMs) {
            dt = resetDtMs;
        }

        this.bgFrameEmitted.dispatch(dt);
        this.bgLastTime = time;
    }

    start() {
        this.handleAnimationFrame();
    }

    handleAnimationFrame(time) {
        let dt = time - this.lastTime;

        if (dt > maxDtMs) {
            dt = resetDtMs;
        }

        this.frameEmitted.dispatch(dt);
        this.lastTime = time;
        window.requestAnimationFrame(this.boundMethod);
    }
}
