import { globalConfig } from "../../core/config";
import { DrawParameters } from "../../core/draw_parameters";
import { enumDirectionToVector } from "../../core/vector";
import { MinerComponent } from "../components/miner";
import { Entity } from "../entity";
import { GameSystemWithFilter } from "../game_system_with_filter";
import { MapChunkView } from "../map_chunk_view";

export class MinerSystem extends GameSystemWithFilter {
    constructor(root) {
        super(root, [MinerComponent]);

        /** Whether chainable miner connections need to be recomputed. */
        this.needsRecompute = true;

        this.root.signals.entityAdded.add(this.onEntityChanged, this);
        this.root.signals.entityChanged.add(this.onEntityChanged, this);
        this.root.signals.entityDestroyed.add(this.onEntityChanged, this);
    }

    /**
     * Called whenever an entity got changed
     * @param {Entity} entity
     */
    onEntityChanged(entity) {
        const minerComp = entity.components.Miner;
        if (!minerComp) {
            return;
        }
        const staticComp = entity.components.StaticMapEntity;

        minerComp.cachedMinedItem = this.root.map.getLowerLayerContentXY(
            staticComp.origin.x,
            staticComp.origin.y
        );

        if (minerComp.chainable) {
            // Miner component, need to recompute
            this.needsRecompute = true;
        }
    }

    update() {
        if (this.needsRecompute) {
            for (const entity of this.allEntities) {
                const minerComp = entity.components.Miner;

                if (!minerComp.chainable) {
                    continue;
                }

                minerComp.cachedChainedMiner = this.findChainedMiner(entity);
                minerComp.cachedExitMiner = undefined;
            }

            for (const entity of this.allEntities) {
                const minerComp = entity.components.Miner;

                if (!minerComp.chainable) {
                    continue;
                }

                this.cacheExitMiners(entity);
            }

            this.needsRecompute = false;
        }

        // note this is in items/sec, not tiles/sec
        let progressGrowth = this.root.dynamicTickrate.deltaSeconds * this.root.hubGoals.getMinerBaseSpeed();

        const targetProgress = 1;

        if (G_IS_DEV && globalConfig.debug.instantMiners) {
            progressGrowth = targetProgress;
        }

        for (const entity of this.allEntities) {
            const minerComp = entity.components.Miner;

            // Check if miner is above an actual tile
            if (!minerComp.cachedMinedItem) {
                continue;
            }

            // Check if we are a chained miner
            if (minerComp.chainable) {
                // Check if we now have a target at the end of the chain - if so, that's what we will progress
                const exitEntity = minerComp.cachedExitMiner;
                if (exitEntity) {
                    const exitMinerComp = exitEntity.components.Miner;
                    if (exitMinerComp.progress < targetProgress + 0.5) {
                        // we can add on some extra progress
                        exitMinerComp.progress += progressGrowth;
                    }
                }
            } else {
                // Normal miner
                if (minerComp.progress < targetProgress) {
                    minerComp.progress += progressGrowth;
                }
            }

            //make sure progress never gets out of control
            // TODO: consider if specific extra progress limit has non-negligible effects,
            // or maybe replace it with an epsilon comparison?
            minerComp.progress = Math.min(minerComp.progress, targetProgress + 0.5);
            if (minerComp.progress >= targetProgress) {
                // We can try to eject
                const extraProgress = minerComp.progress - targetProgress;

                const ejectorComp = entity.components.ItemEjector;
                if (ejectorComp.tryEject(0, minerComp.cachedMinedItem, extraProgress)) {
                    // Analytics hook
                    this.root.signals.itemProduced.dispatch(minerComp.cachedMinedItem);

                    minerComp.progress -= targetProgress;
                }
            }
        }
    }

    /**
     * Finds the target chained miner for a given entity
     * @param {Entity} entity
     * @returns {Entity|null|undefined} The chained entity or null if not found, or undefined if not over a resource
     */
    findChainedMiner(entity) {
        const ejectComp = entity.components.ItemEjector;
        const staticComp = entity.components.StaticMapEntity;
        const minedItem = entity.components.Miner.cachedMinedItem;
        const contentsBelow = this.root.map.getLowerLayerContentXY(staticComp.origin.x, staticComp.origin.y);
        if (!contentsBelow) {
            // This miner has no contents
            return undefined;
        }

        const ejectingSlot = ejectComp.slots[0];
        const ejectingPos = staticComp.localTileToWorld(ejectingSlot.pos);
        const ejectingDirection = staticComp.localDirectionToWorld(ejectingSlot.direction);

        const targetTile = ejectingPos.add(enumDirectionToVector[ejectingDirection]);
        const targetContents = this.root.map.getTileContent(targetTile, "regular");

        // Check if we are connected to another chainable miner of the same item and thus do not eject directly
        if (targetContents) {
            const targetMinerComp = targetContents.components.Miner;
            if (
                targetMinerComp &&
                targetMinerComp.chainable &&
                targetMinerComp.cachedMinedItem == minedItem
            ) {
                const targetLowerLayer = this.root.map.getLowerLayerContentXY(targetTile.x, targetTile.y);
                if (targetLowerLayer) {
                    return targetContents;
                }
            }
        }

        return null;
    }

    /**
     * Recursively finds the target exit miner for a given entity
     * and assigns it to all miners along the way
     * @param {Entity} entity
     * @param {Entity=} firstEntity The entity that started the recursion, for loop detection
     * @returns {Entity|null} The exit miner entity or null if none
     */
    cacheExitMiners(entity, firstEntity = entity) {
        const minerComp = entity.components.Miner;

        if (minerComp.cachedExitMiner !== undefined) {
            // We're at an already-computed miner, yay!
            return minerComp.cachedExitMiner;
        }

        const target = minerComp.cachedChainedMiner;
        switch (target) {
            case null:
                // We're at the front
                return (minerComp.cachedExitMiner = entity);
            case undefined:
            case firstEntity:
                // We shouldn't eject to anywhere, or we're in a loop
                return null;
        }

        return (minerComp.cachedExitMiner = this.cacheExitMiners(target, firstEntity));
    }

    /**
     *
     * @param {DrawParameters} parameters
     * @param {MapChunkView} chunk
     */
    drawChunk(parameters, chunk) {
        const contents = chunk.containedEntitiesByLayer.regular;

        for (let i = 0; i < contents.length; ++i) {
            const entity = contents[i];
            const minerComp = entity.components.Miner;
            if (!minerComp) {
                continue;
            }

            const staticComp = entity.components.StaticMapEntity;
            if (!minerComp.cachedMinedItem) {
                continue;
            }

            // Draw the item background - this is to hide the ejected item animation from
            // the item ejector

            const padding = 3;
            const destX = staticComp.origin.x * globalConfig.tileSize + padding;
            const destY = staticComp.origin.y * globalConfig.tileSize + padding;
            const dimensions = globalConfig.tileSize - 2 * padding;

            if (parameters.visibleRect.containsRect4Params(destX, destY, dimensions, dimensions)) {
                parameters.context.fillStyle = minerComp.cachedMinedItem.getBackgroundColorAsResource();
                parameters.context.fillRect(destX, destY, dimensions, dimensions);
            }

            minerComp.cachedMinedItem.drawItemCenteredClipped(
                (0.5 + staticComp.origin.x) * globalConfig.tileSize,
                (0.5 + staticComp.origin.y) * globalConfig.tileSize,
                parameters,
                globalConfig.defaultItemDiameter
            );
        }
    }
}
