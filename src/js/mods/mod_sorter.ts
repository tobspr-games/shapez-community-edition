import { Logger } from "@/core/logging";
import type { LoadedModEntry } from "./modloader";
import satisfies from "semver/functions/satisfies";

const LOG = new Logger("mod_sorter");

export function sortMods(loadedMods: LoadedModEntry[]): LoadedModEntry[] {
    const initialGraph = Object.fromEntries(
        loadedMods.map(mod => [mod.entry.metadata.id, mod.entry.metadata])
    );

    const loadOrderGraph: Record<string, string[]> = Object.fromEntries(
        Object.keys(initialGraph).map(id => [id, []])
    );

    for (const [modID, metadata] of Object.entries(initialGraph)) {
        if (metadata.format === 1) continue;
        const deps = metadata.dependencies;
        for (const depInfo of deps) {
            if (!depInfo.optional && initialGraph[depInfo.id] === undefined) {
                LOG.warn(`${modID} has a dependency on ${depInfo.id}, which is not installed.`);
            } else if (depInfo.optional && initialGraph[depInfo.id] === undefined) {
                LOG.warn(`${modID} has an optional dependency on ${depInfo.id}, which is not installed.`);
                continue;
            }
            const depMetadata = initialGraph[depInfo.id]!;
            if (!satisfies(depInfo.version, depMetadata.version)) {
                LOG.warn(
                    `${modID} has a dependency on ${depInfo.id}@${depInfo.version}, which does not match the version installed: ${depMetadata.version}`
                );
            }

            if (depInfo.loadOrder === "after") {
                loadOrderGraph[modID]!.push(depInfo.id);
            } else if (depInfo.loadOrder === "before") {
                loadOrderGraph[depInfo.id]!.push(modID);
            }
        }
        if (metadata.loadOrder === "afterAll") {
            loadOrderGraph[modID] = Object.keys(loadOrderGraph).filter(id => id !== modID);
            continue;
        } else if (metadata.loadOrder === "beforeAll") {
            for (const id of Object.keys(loadOrderGraph)) {
                if (id === modID || loadOrderGraph[id]!.includes(modID)) continue;
                loadOrderGraph[id]!.push(modID);
            }
            continue;
        }
    }

    const keys = Object.keys(loadOrderGraph);
    const used = new Set();
    const sortedModIds = [];
    let i: number;
    let item: string;
    let length: number;

    do {
        length = keys.length;
        i = 0;
        while (i < keys.length) {
            if (loadOrderGraph[keys[i]!]!.every(Set.prototype.has, used)) {
                item = keys.splice(i, 1)[0];
                sortedModIds.push(item);
                used.add(item);
                continue;
            }
            i++;
        }
    } while (keys.length && keys.length !== length);

    LOG.debug(sortedModIds);

    return sortedModIds.map(id => loadedMods.find(mod => id === mod.entry.metadata.id));
}
