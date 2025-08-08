/// <reference lib="WebWorker" />

import { encode } from "@msgpack/msgpack";

async function compress(data: unknown): Promise<Uint8Array> {
    const input = new Blob([encode(data)]).stream();
    const gzip = new CompressionStream("gzip");
    const response = new Response(input.pipeThrough(gzip));

    return new Uint8Array(await response.arrayBuffer());
}

self.addEventListener("message", async ev => {
    try {
        const result = await compress(ev.data);
        self.postMessage({ result, error: null }, [result.buffer]);
    } catch (err) {
        self.postMessage({ result: null, error: err });
    }
});
