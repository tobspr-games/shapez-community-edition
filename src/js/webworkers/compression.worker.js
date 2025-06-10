import { encode } from "@msgpack/msgpack";

onmessage = async event => {
    await navigator.locks.request("compression", () => {
        new Response(
            new ReadableStream({
                type: "bytes",
                start(controller) {
                    controller.enqueue(encode(event.data));
                    controller.close();
                },
            }).pipeThrough(new CompressionStream("gzip"))
        )
            .arrayBuffer()
            .then(buffer => {
                postMessage(new Uint8Array(buffer), [buffer]);
            });
    })
};
