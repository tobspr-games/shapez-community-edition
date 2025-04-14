import { globalConfig } from "../core/config";
import { compressX64 } from "../core/lzstring";
import { computeCrc } from "../core/sensitive_utils.encrypt";

self.addEventListener("message", event => {
    // @ts-ignore
    const { jobId, job, data } = event.data;
    const result = performJob(job, data);

    // @ts-ignore
    self.postMessage({ jobId, result });
});

function performJob(job, data) {
    switch (job) {
        case "compressX64": {
            return compressX64(data);
        }

        case "compressObject": {
            const stringified = JSON.stringify(data.obj);

            const checksum = computeCrc(stringified + globalConfig.info.file);
            return data.compressionPrefix + compressX64(checksum + stringified);
        }
        default:
            throw new Error("Webworker: Unknown job: " + job);
    }
}
