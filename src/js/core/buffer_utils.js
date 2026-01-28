import { globalConfig } from "./config";
import { Logger } from "./logging";
import { fastArrayDelete } from "./utils";

const logger = new Logger("buffer_utils");

/**
 * @typedef {{
 *   canvas: HTMLCanvasElement,
 *   context: CanvasRenderingContext2D
 * }} CanvasCacheEntry
 */

/**
 * @type {Array<CanvasCacheEntry>}
 */
const registeredCanvas = [];

/**
 * Buckets for each width * height combination
 * @type {Map<number, Array<CanvasCacheEntry>>}
 */
const freeCanvasBuckets = new Map();

/**
 * Track statistics
 */
const stats = {
    vramUsage: 0,
    backlogVramUsage: 0,
    bufferCount: 0,
    numReused: 0,
    numCreated: 0,
};

/**
 *
 * @param {HTMLCanvasElement} canvas
 */
export function getBufferVramUsageBytes(canvas) {
    assert(canvas, "no canvas given");
    assert(Number.isFinite(canvas.width), "bad canvas width: " + canvas.width);
    assert(Number.isFinite(canvas.height), "bad canvas height" + canvas.height);
    return canvas.width * canvas.height * 4;
}

/**
 * Returns stats on the allocated buffers
 */
export function getBufferStats() {
    let numBuffersFree = 0;
    freeCanvasBuckets.forEach(bucket => {
        numBuffersFree += bucket.length;
    });

    return {
        ...stats,
        backlogKeys: freeCanvasBuckets.size,
        backlogSize: numBuffersFree,
    };
}

/**
 * Clears the backlog buffers if they grew too much
 */
export function clearBufferBacklog() {
    freeCanvasBuckets.forEach(bucket => {
        while (bucket.length > 500) {
            const entry = bucket[bucket.length - 1];
            stats.backlogVramUsage -= getBufferVramUsageBytes(entry.canvas);
            delete entry.canvas;
            delete entry.context;
            bucket.pop();
        }
    });
}

/**
 * Creates a new offscreen buffer
 * @param {Number} w
 * @param {Number} h
 * @returns {[HTMLCanvasElement, CanvasRenderingContext2D]}
 */
export function makeOffscreenBuffer(w, h, { smooth = true, reusable = true, label = "buffer" }) {
    assert(w >= 1 && h >= 1, "Invalid offscreen buffer size: W or H < 1");

    const recommendedSize = 1024 * 1024;
    if (w * h > recommendedSize) {
        logger.warn("Creating huge buffer:", w, "x", h, "with label", label);
    }

    w = Math.floor(w);
    h = Math.floor(h);

    let canvas = null;
    let context = null;

    // Ok, search in cache first
    const bucket = freeCanvasBuckets.get(w * h) || [];

    for (let i = 0; i < bucket.length; ++i) {
        const { canvas: useableCanvas, context: useableContext } = bucket[i];
        if (useableCanvas.width === w && useableCanvas.height === h) {
            // Ok we found one
            canvas = useableCanvas;
            context = useableContext;

            // Restore past state
            context.restore();
            context.save();
            context.clearRect(0, 0, canvas.width, canvas.height);

            delete canvas.style.width;
            delete canvas.style.height;

            stats.numReused++;
            stats.backlogVramUsage -= getBufferVramUsageBytes(canvas);
            fastArrayDelete(bucket, i);
            break;
        }
    }

    // None found , create new one
    if (!canvas) {
        canvas = document.createElement("canvas");
        context = canvas.getContext("2d" /*, { alpha } */);

        stats.numCreated++;

        canvas.width = w;
        canvas.height = h;

        // Initial state
        context.save();
    }

    // @ts-ignore
    canvas.label = label;

    context.imageSmoothingEnabled = smooth;
    context.imageSmoothingQuality = globalConfig.smoothing.quality;

    if (reusable) {
        registerCanvas(canvas, context);
    }

    return [canvas, context];
}

/**
 * Frees a canvas
 * @param {HTMLCanvasElement} canvas
 */
export function registerCanvas(canvas, context) {
    registeredCanvas.push({ canvas, context });

    stats.bufferCount += 1;
    const bytesUsed = getBufferVramUsageBytes(canvas);
    stats.vramUsage += bytesUsed;
}

/**
 * Frees a canvas
 * @param {HTMLCanvasElement} canvas
 */
export function freeCanvas(canvas) {
    assert(canvas, "Canvas is empty");

    let index = -1;
    let data = null;

    for (let i = 0; i < registeredCanvas.length; ++i) {
        if (registeredCanvas[i].canvas === canvas) {
            index = i;
            data = registeredCanvas[i];
            break;
        }
    }

    if (index < 0) {
        logger.error("Tried to free unregistered canvas of size", canvas.width, canvas.height);
        return;
    }
    fastArrayDelete(registeredCanvas, index);

    const key = canvas.width * canvas.height;
    const bucket = freeCanvasBuckets.get(key);
    if (bucket) {
        bucket.push(data);
    } else {
        freeCanvasBuckets.set(key, [data]);
    }

    stats.bufferCount -= 1;

    const bytesUsed = getBufferVramUsageBytes(canvas);
    stats.vramUsage -= bytesUsed;
    stats.backlogVramUsage += bytesUsed;
}
