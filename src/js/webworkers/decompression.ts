/// <reference lib="WebWorker" />

if (!(typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope)) {
    throw new Error("webworkers should never be run on the main thread!");
}

import { decodeAsync } from "@msgpack/msgpack";

async function decompress(data: Uint8Array): Promise<unknown> {
    const input = new Blob([data]).stream();
    const gunzip = new DecompressionStream("gzip");

    return await decodeAsync(input.pipeThrough(gunzip));
}

self.addEventListener("message", async ev => {
    if (!(ev.data instanceof Uint8Array)) {
        self.postMessage({ result: null, error: new Error("Incoming data must be of type Uint8Array") });
        return;
    }

    try {
        const result = await decompress(ev.data);
        self.postMessage({ result, error: null });
    } catch (err) {
        self.postMessage({ result: null, error: err });
    }
});
