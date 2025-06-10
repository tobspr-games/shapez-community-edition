export interface Compression {
    compress(data: unknown): Promise<Uint8Array>;
    decompress(data: Uint8Array): Promise<unknown>;
}

type CompressionWorkerResponse<T> = { result: T; error: null } | { result: null; error: Error };

export class DefaultCompression implements Compression {
    compress(data: unknown): Promise<Uint8Array> {
        const { promise, reject, resolve } = Promise.withResolvers<Uint8Array>();

        // NOTE: new URL(...) has to be inlined for webpack to process it correctly
        const worker = new Worker(new URL("../webworkers/compression", import.meta.url));
        worker.addEventListener("error", ev => reject(ev.message));

        worker.addEventListener("message", ev => {
            const response = ev.data as CompressionWorkerResponse<Uint8Array>;
            if (response.error !== null) {
                reject(response.error);
                return;
            }

            resolve(response.result);
        });

        this.scheduleWorkerTermination(worker);
        worker.postMessage(data);
        return promise;
    }

    decompress(data: Uint8Array): Promise<unknown> {
        const { promise, reject, resolve } = Promise.withResolvers<unknown>();

        const worker = new Worker(new URL("../webworkers/decompression", import.meta.url));
        worker.addEventListener("error", ev => reject(new Error(ev.message)));

        worker.addEventListener("message", ev => {
            const response = ev.data as CompressionWorkerResponse<unknown>;
            if (response.error !== null) {
                reject(response.error);
                return;
            }

            resolve(response.result);
        });

        this.scheduleWorkerTermination(worker);
        worker.postMessage(data, [data.buffer]);
        return promise;
    }

    private scheduleWorkerTermination(worker: Worker): void {
        worker.addEventListener("message", () => worker.terminate(), { once: true });
        worker.addEventListener("error", () => worker.terminate(), { once: true });
    }
}
