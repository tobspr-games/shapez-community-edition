import { decodeAsync } from "@msgpack/msgpack";

onmessage = (event) => {
    const decompressionStream = new DecompressionStream("gzip")
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(event.data);
            controller.close();
        }
    });
    decodeAsync(stream.pipeThrough(decompressionStream)).then(val => {
        postMessage(val)
    })
}
