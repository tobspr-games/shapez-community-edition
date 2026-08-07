import { MetaBuilding } from "@/game/meta_building";
import { Logger } from "./logging";

const logger = new Logger("registry");

// This interface may be implemented implicitly
export interface Registrable {
    getId(): string;
}

export class Registry<T extends Registrable> {
    private static registriesByType = new Map<unknown, Registry<Registrable>>();

    static BUILDINGS = Registry.createRegistry(MetaBuilding);

    private frozen = false;
    private idToInstance = new Map<string, T>();

    private constructor() {
        // Use the static createRegistry method to keep track of all registries
    }

    static createRegistry<T extends Registrable>(instanceType: Class<T>): Registry<T> {
        const registry = new Registry<T>();
        Registry.registriesByType.set(instanceType, registry);

        return registry;
    }

    static getForType<T extends Registrable>(instanceType: Class<T>): Registry<T> {
        assertAlways(this.registriesByType.has(instanceType), "Cannot find registry for the specified type");
        return this.registriesByType.get(instanceType) as Registry<T>;
    }

    static freezeAll() {
        for (const registry of this.registriesByType.values()) {
            registry.freeze();
        }
    }

    get size(): number {
        return this.idToInstance.size;
    }

    register(instance: T): void {
        const id = instance.getId();
        assertAlways(!this.frozen, `Cannot register "${id}" once registry is frozen`);

        if (this.idToInstance.has(id)) {
            logger.warn(`ID "${id}" is already assigned, replacing`);
        }

        this.idToInstance.set(id, instance);
    }

    get(id: string): T {
        assert(this.idToInstance.has(id), `Registry entry not found by ID "${id}"`);
        return this.idToInstance.get(id)!;
    }

    getAllIds(): string[] {
        return [...this.idToInstance.keys()];
    }

    [Symbol.iterator](): MapIterator<[string, T]> {
        return this.idToInstance.entries();
    }

    freeze() {
        assertAlways(!this.frozen, "Attempted to freeze an already frozen registry");
        this.frozen = true;
    }
}
