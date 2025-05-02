import { globalConfig } from "../core/config";
import { createLogger } from "../core/logging";
import { newEmptyMap } from "../core/utils";
import { BasicSerializableObject, types } from "../savegame/serialization";
import { Component } from "./component";
import { Entity } from "./entity";
import { GameRoot } from "./root";

const logger = createLogger("entity_manager");

// Manages all entities

// NOTICE: We use arrayDeleteValue instead of fastArrayDeleteValue since that does not preserve the order
// This is slower but we need it for the street path generation

export class EntityManager extends BasicSerializableObject {
    readonly root: GameRoot;
    readonly entities = new Map<number, Entity>();

    // We store a separate list with entities to destroy, since we don't destroy
    // them instantly
    private destroyList: Entity[] = [];

    // Store a map from componentid to entities - This is used by the game system
    // for faster processing
    private readonly componentToEntity: Record<string, Set<Entity>> = newEmptyMap();

    // Store the next uid to use
    private nextUid = 10000;

    constructor(root: GameRoot) {
        super();
        this.root = root;
    }

    static getId() {
        return "EntityManager";
    }

    static getSchema() {
        return {
            nextUid: types.uint,
        };
    }

    getStatsText() {
        return this.entities.size + " entities [" + this.destroyList.length + " to kill]";
    }

    // Main update
    update() {
        this.processDestroyList();
    }

    /**
     * Registers a new entity
     * @param uid Optional predefined uid
     */
    registerEntity(entity: Entity, uid: number | null = null) {
        if (G_IS_DEV && !globalConfig.debug.disableSlowAsserts) {
            assert(
                this.entities.get(entity.uid) !== entity,
                `RegisterEntity() called twice for entity ${entity}`
            );
        }
        assert(!entity.destroyed, `Attempting to register destroyed entity ${entity}`);

        if (G_IS_DEV && !globalConfig.debug.disableSlowAsserts && uid !== null) {
            assert(!this.findByUid(uid, false), "Entity uid already taken: " + uid);
            assert(uid >= 0 && uid < Number.MAX_SAFE_INTEGER, "Invalid uid passed: " + uid);
        }

        // Give each entity a unique id
        entity.uid = uid ? uid : this.generateUid();
        entity.registered = true;

        this.entities.set(entity.uid, entity);

        // Register into the componentToEntity map
        for (const componentId in entity.components) {
            if (entity.components[componentId]) {
                const set = (this.componentToEntity[componentId] ??= new Set());
                set.add(entity);
            }
        }

        this.root.signals.entityAdded.dispatch(entity);
    }

    /**
     * Generates a new uid
     */
    generateUid(): number {
        return this.nextUid++;
    }

    /**
     * Call to attach a new component after the creation of the entity
     */
    attachDynamicComponent(entity: Entity, component: Component) {
        entity.addComponent(component, true);
        const componentId = /** @type {typeof Component} */ component.constructor.getId();
        const set = (this.componentToEntity[componentId] ??= new Set());
        set.add(entity);
        this.root.signals.entityGotNewComponent.dispatch(entity);
    }

    /**
     * Call to remove a component after the creation of the entity
     */
    removeDynamicComponent(entity: Entity, component: typeof Component) {
        entity.removeComponent(component, true);
        const componentId = /** @type {typeof Component} */ component.constructor.getId();

        this.componentToEntity[componentId].delete(entity);
        this.root.signals.entityComponentRemoved.dispatch(entity);
    }

    /**
     * Finds an entity by its uid
     */
    findByUid(uid: number, errorWhenNotFound = true): Entity {
        const entity = this.entities.get(uid);

        if (entity === undefined || entity.queuedForDestroy || entity.destroyed) {
            if (errorWhenNotFound) {
                logger.warn("Entity with UID", uid, "not found (destroyed)");
            }

            return null;
        }

        return entity;
    }

    /**
     * Returns a map which gives a mapping from UID to Entity.
     * This map is not updated.
     */
    getFrozenUidSearchMap(): Map<number, Entity> {
        const result = new Map();
        for (const [uid, entity] of this.entities) {
            if (!entity.queuedForDestroy && !entity.destroyed) {
                result.set(uid, entity);
            }
        }
        return result;
    }

    /**
     * Returns all entities having the given component
     * @deprecated use {@link getEntitiesWithComponent} instead
     */
    getAllWithComponent(componentHandle: typeof Component): Entity[] {
        return [...(this.componentToEntity[componentHandle.getId()] ?? new Set())];
    }

    /**
     * A version of {@link getAllWithComponent} that returns a Set
     */
    getEntitiesWithComponent(componentHandle: typeof Component): Set<Entity> {
        return new Set(this.componentToEntity[componentHandle.getId()] ?? []);
    }

    /**
     * Unregisters all components of an entity from the component to entity mapping
     */
    unregisterEntityComponents(entity: Entity) {
        for (const componentId in entity.components) {
            if (entity.components[componentId]) {
                this.componentToEntity[componentId].delete(entity);
            }
        }
    }

    // Processes the entities to destroy and actually destroys them
    processDestroyList() {
        for (let i = 0; i < this.destroyList.length; ++i) {
            const entity = this.destroyList[i];

            // Remove from entities list
            this.entities.delete(entity.uid);

            // Remove from componentToEntity list
            this.unregisterEntityComponents(entity);

            entity.registered = false;
            entity.destroyed = true;

            this.root.signals.entityDestroyed.dispatch(entity);
        }

        this.destroyList = [];
    }

    /**
     * Queues an entity for destruction
     */
    destroyEntity(entity: Entity) {
        if (entity.destroyed) {
            logger.error("Tried to destroy already destroyed entity:", entity.uid);
            return;
        }

        if (entity.queuedForDestroy) {
            logger.error("Trying to destroy entity which is already queued for destroy!", entity.uid);
            return;
        }

        if (this.destroyList.indexOf(entity) < 0) {
            this.destroyList.push(entity);
            entity.queuedForDestroy = true;
            this.root.signals.entityQueuedForDestroy.dispatch(entity);
        } else {
            assert(false, "Trying to destroy entity twice");
        }
    }
}
