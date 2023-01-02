/* typehints:start */
import type { Application } from "../application";
import type { Entity } from "../game/entity";
import type { GameRoot } from "../game/root";
import type { THEMES } from "../game/theme";
/* typehints:end */

import { enumAnalyticsDataSource } from "../game/production_analytics";
import { ShapeDefinition } from "../game/shape_definition";
import { ShapeItem } from "../game/items/shape_item";
import { globalConfig } from "../core/config";

export const ACHIEVEMENTS = {
    belt500Tiles: "belt500Tiles",
    blueprint100k: "blueprint100k",
    blueprint1m: "blueprint1m",
    completeLvl26: "completeLvl26",
    cutShape: "cutShape",
    darkMode: "darkMode",
    destroy1000: "destroy1000",
    irrelevantShape: "irrelevantShape",
    level100: "level100",
    level50: "level50",
    logoBefore18: "logoBefore18",
    mam: "mam",
    mapMarkers15: "mapMarkers15",
    noBeltUpgradesUntilBp: "noBeltUpgradesUntilBp",
    noInverseRotater: "noInverseRotater",
    oldLevel17: "oldLevel17",
    openWires: "openWires",
    paintShape: "paintShape",
    place5000Wires: "place5000Wires",
    placeBlueprint: "placeBlueprint",
    placeBp1000: "placeBp1000",
    play1h: "play1h",
    play10h: "play10h",
    play20h: "play20h",
    produceLogo: "produceLogo",
    produceMsLogo: "produceMsLogo",
    produceRocket: "produceRocket",
    rotateShape: "rotateShape",
    speedrunBp30: "speedrunBp30",
    speedrunBp60: "speedrunBp60",
    speedrunBp120: "speedrunBp120",
    stack4Layers: "stack4Layers",
    stackShape: "stackShape",
    store100Unique: "store100Unique",
    storeShape: "storeShape",
    throughputBp25: "throughputBp25",
    throughputBp50: "throughputBp50",
    throughputLogo25: "throughputLogo25",
    throughputLogo50: "throughputLogo50",
    throughputRocket10: "throughputRocket10",
    throughputRocket20: "throughputRocket20",
    trash1000: "trash1000",
    unlockWires: "unlockWires",
    upgradesTier5: "upgradesTier5",
    upgradesTier8: "upgradesTier8",
};

const DARK_MODE: keyof typeof THEMES = "dark";

const HOUR_1 = 3600; // Seconds
const HOUR_10 = HOUR_1 * 10;
const HOUR_20 = HOUR_1 * 20;
const ITEM_SHAPE = ShapeItem.getId();
const MINUTE_30 = 1800; // Seconds
const MINUTE_60 = MINUTE_30 * 2;
const MINUTE_120 = MINUTE_30 * 4;
const ROTATER_CCW_CODE = 12;
const ROTATER_180_CODE = 13;
const SHAPE_BP = "CbCbCbRb:CwCwCwCw";
const SHAPE_LOGO = "RuCw--Cw:----Ru--";
const SHAPE_MS_LOGO = "RgRyRbRr";
const SHAPE_OLD_LEVEL_17 = "WrRgWrRg:CwCrCwCr:SgSgSgSg";
const SHAPE_ROCKET = "CbCuCbCu:Sr------:--CrSrCr:CwCwCwCw";

const WIRE_LAYER: Layer = "wires";

export class AchievementProviderInterface {
    /* typehints:start */
    collection = null as AchievementCollection | undefined;
    /* typehints:end */

    constructor(public app: Application) {}

    /**
     * Initializes the achievement provider.
     * @abstract
     */
    initialize(): Promise<void> {
        abstract;
        return Promise.reject();
    }

    /**
     * Opportunity to do additional initialization work with the GameRoot.
     * @abstract
     */
    onLoad(root: GameRoot): Promise<void> {
        abstract;
        return Promise.reject();
    }

    hasLoaded(): boolean {
        abstract;
        return false;
    }

    /**
     * Call to activate an achievement with the provider
     * @param key - Maps to an Achievement
     * @abstract
     */
    activate(key: string): Promise<void> {
        abstract;
        return Promise.reject();
    }

    /**
     * Checks if achievements are supported in the current build
     * @abstract
     */
    hasAchievements(): boolean {
        abstract;
        return false;
    }
}

export class Achievement {
    public activate = null;
    public activatePromise = null;
    public receiver = null;
    public signal = null;
    /**
     * @param key - An ACHIEVEMENTS key
     */
    constructor(public key: string) {}

    init() {}

    isValid() {
        return true;
    }

    unlock() {
        if (!this.activatePromise) {
            this.activatePromise = this.activate(this.key);
        }

        return this.activatePromise;
    }
}

export class AchievementCollection {
    public map = new Map();
    public root: GameRoot;

    /** @param activate - Resolves when provider activation is complete */
    constructor(public activate: (arg?: any) => void) {
        this.add(ACHIEVEMENTS.belt500Tiles, {
            isValid: this.isBelt500TilesValid,
            signal: "entityAdded",
        });
        this.add(ACHIEVEMENTS.blueprint100k, this.createBlueprintOptions(100000));
        this.add(ACHIEVEMENTS.blueprint1m, this.createBlueprintOptions(1000000));
        this.add(ACHIEVEMENTS.completeLvl26, this.createLevelOptions(26));
        this.add(ACHIEVEMENTS.cutShape);
        this.add(ACHIEVEMENTS.darkMode, {
            isValid: this.isDarkModeValid,
        });
        this.add(ACHIEVEMENTS.destroy1000, {
            isValid: this.isDestroy1000Valid,
        });
        this.add(ACHIEVEMENTS.irrelevantShape, {
            isValid: this.isIrrelevantShapeValid,
            signal: "shapeDelivered",
        });
        this.add(ACHIEVEMENTS.level100, this.createLevelOptions(100));
        this.add(ACHIEVEMENTS.level50, this.createLevelOptions(50));
        this.add(ACHIEVEMENTS.logoBefore18, {
            isValid: this.isLogoBefore18Valid,
            signal: "itemProduced",
        });
        this.add(ACHIEVEMENTS.mam, {
            isValid: this.isMamValid,
        });
        this.add(ACHIEVEMENTS.mapMarkers15, {
            isValid: this.isMapMarkers15Valid,
        });
        this.add(ACHIEVEMENTS.noBeltUpgradesUntilBp, {
            isValid: this.isNoBeltUpgradesUntilBpValid,
            signal: "storyGoalCompleted",
        });
        this.add(ACHIEVEMENTS.noInverseRotater, {
            init: this.initNoInverseRotater,
            isValid: this.isNoInverseRotaterValid,
            signal: "storyGoalCompleted",
        });
        this.add(ACHIEVEMENTS.oldLevel17, this.createShapeOptions(SHAPE_OLD_LEVEL_17));
        this.add(ACHIEVEMENTS.openWires, {
            isValid: this.isOpenWiresValid,
            signal: "editModeChanged",
        });
        this.add(ACHIEVEMENTS.paintShape);
        this.add(ACHIEVEMENTS.place5000Wires, {
            isValid: this.isPlace5000WiresValid,
        });
        this.add(ACHIEVEMENTS.placeBlueprint, {
            isValid: this.isPlaceBlueprintValid,
        });
        this.add(ACHIEVEMENTS.placeBp1000, {
            isValid: this.isPlaceBp1000Valid,
        });
        this.add(ACHIEVEMENTS.play1h, this.createTimeOptions(HOUR_1));
        this.add(ACHIEVEMENTS.play10h, this.createTimeOptions(HOUR_10));
        this.add(ACHIEVEMENTS.play20h, this.createTimeOptions(HOUR_20));
        this.add(ACHIEVEMENTS.produceLogo, this.createShapeOptions(SHAPE_LOGO));
        this.add(ACHIEVEMENTS.produceRocket, this.createShapeOptions(SHAPE_ROCKET));
        this.add(ACHIEVEMENTS.produceMsLogo, this.createShapeOptions(SHAPE_MS_LOGO));
        this.add(ACHIEVEMENTS.rotateShape);
        this.add(ACHIEVEMENTS.speedrunBp30, this.createSpeedOptions(12, MINUTE_30));
        this.add(ACHIEVEMENTS.speedrunBp60, this.createSpeedOptions(12, MINUTE_60));
        this.add(ACHIEVEMENTS.speedrunBp120, this.createSpeedOptions(12, MINUTE_120));
        this.add(ACHIEVEMENTS.stack4Layers, {
            isValid: this.isStack4LayersValid,
            signal: "itemProduced",
        });
        this.add(ACHIEVEMENTS.stackShape);
        this.add(ACHIEVEMENTS.store100Unique, {
            init: this.initStore100Unique,
            isValid: this.isStore100UniqueValid,
            signal: "shapeDelivered",
        });
        this.add(ACHIEVEMENTS.storeShape, {
            init: this.initStoreShape,
            isValid: this.isStoreShapeValid,
        });
        this.add(ACHIEVEMENTS.throughputBp25, this.createRateOptions(SHAPE_BP, 25));
        this.add(ACHIEVEMENTS.throughputBp50, this.createRateOptions(SHAPE_BP, 50));
        this.add(ACHIEVEMENTS.throughputLogo25, this.createRateOptions(SHAPE_LOGO, 25));
        this.add(ACHIEVEMENTS.throughputLogo50, this.createRateOptions(SHAPE_LOGO, 50));
        this.add(ACHIEVEMENTS.throughputRocket10, this.createRateOptions(SHAPE_ROCKET, 10));
        this.add(ACHIEVEMENTS.throughputRocket20, this.createRateOptions(SHAPE_ROCKET, 20));
        this.add(ACHIEVEMENTS.trash1000, {
            init: this.initTrash1000,
            isValid: this.isTrash1000Valid,
        });
        this.add(ACHIEVEMENTS.unlockWires, this.createLevelOptions(20));
        this.add(ACHIEVEMENTS.upgradesTier5, this.createUpgradeOptions(5));
        this.add(ACHIEVEMENTS.upgradesTier8, this.createUpgradeOptions(8));
    }

    initialize(root: GameRoot) {
        this.root = root;
        this.root.signals.achievementCheck.add(this.unlock, this);
        this.root.signals.bulkAchievementCheck.add(this.bulkUnlock, this);

        for (let [key, achievement] of this.map.entries()) {
            if (achievement.signal) {
                achievement.receiver = this.unlock.bind(this, key);
                this.root.signals[achievement.signal].add(achievement.receiver);
            }

            if (achievement.init) {
                achievement.init();
            }
        }

        if (!this.hasDefaultReceivers()) {
            this.root.signals.achievementCheck.remove(this.unlock);
            this.root.signals.bulkAchievementCheck.remove(this.bulkUnlock);
        }
    }

    /** @param key - Maps to an Achievement */
    add(
        key: string,
        options: {
            init?: (...args: any[]) => any;
            isValid?: (...args: any[]) => boolean;
            signal?: string;
        } = {}
    ) {
        if (G_IS_DEV) {
            assert(ACHIEVEMENTS[key], "Achievement key not found: ", key);
        }

        const achievement = new Achievement(key);

        achievement.activate = this.activate;

        if (options.init) {
            achievement.init = options.init.bind(this, achievement);
        }

        if (options.isValid) {
            achievement.isValid = options.isValid.bind(this);
        }

        if (options.signal) {
            achievement.signal = options.signal;
        }

        this.map.set(key, achievement);
    }

    bulkUnlock() {
        for (let i = 0; i < arguments.length; i += 2) {
            this.unlock(arguments[i], arguments[i + 1]);
        }
    }

    /**
     * @param key - Maps to an Achievement
     * @param data - Data received from signal dispatches for validation
     */
    unlock(key: string, data: any) {
        if (!this.map.has(key)) {
            return;
        }

        const achievement = this.map.get(key);

        if (!achievement.isValid(data)) {
            return;
        }

        achievement
            .unlock()
            .then(() => {
                this.onActivate(null, key);
            })
            .catch(err => {
                this.onActivate(err, key);
            });
    }

    /**
     * Cleans up after achievement activation attempt with the provider. Could
     * utilize err to retry some number of times if needed.
     * @param err - Error is null if activation was successful
     * @param key - Maps to an Achievement
     */
    onActivate(err: Error | undefined, key: string) {
        this.remove(key);

        if (!this.hasDefaultReceivers()) {
            this.root.signals.achievementCheck.remove(this.unlock);
        }
    }

    /**
 @param key - Maps to an Achievement
*/
    remove(key: string) {
        const achievement = this.map.get(key);
        if (achievement) {
            if (achievement.receiver) {
                this.root.signals[achievement.signal].remove(achievement.receiver);
            }

            this.map.delete(key);
        }
    }

    /**
     * Check if the collection-level achievementCheck receivers are still
     * necessary.
     */
    hasDefaultReceivers() {
        if (!this.map.size) {
            return false;
        }

        for (let achievement of this.map.values()) {
            if (!achievement.signal) {
                return true;
            }
        }

        return false;
    }

    /*
     * Remaining methods exist to extend Achievement instances within the
     * collection.
     */

    hasAllUpgradesAtLeastAtTier(tier) {
        const upgrades = this.root.gameMode.getUpgrades();

        for (let upgradeId in upgrades) {
            if (this.root.hubGoals.getUpgradeLevel(upgradeId) < tier - 1) {
                return false;
            }
        }

        return true;
    }

    isShape(item: ShapeItem, shape: string): boolean {
        return item.getItemType() === ITEM_SHAPE && item.definition.getHash() === shape;
    }

    createBlueprintOptions(count) {
        return {
            init: ({ key }) => this.unlock(key, ShapeDefinition.fromShortKey(SHAPE_BP)),
            isValid: definition =>
                definition.cachedHash === SHAPE_BP && this.root.hubGoals.storedShapes[SHAPE_BP] >= count,
            signal: "shapeDelivered",
        };
    }

    createLevelOptions(level) {
        return {
            init: ({ key }) => this.unlock(key, this.root.hubGoals.level),
            isValid: currentLevel => currentLevel > level,
            signal: "storyGoalCompleted",
        };
    }

    createRateOptions(shape, rate) {
        return {
            isValid: () => {
                return (
                    this.root.productionAnalytics.getCurrentShapeRateRaw(
                        enumAnalyticsDataSource.delivered,
                        this.root.shapeDefinitionMgr.getShapeFromShortKey(shape)
                    ) /
                        globalConfig.analyticsSliceDurationSeconds >=
                    rate
                );
            },
        };
    }

    createShapeOptions(shape) {
        return {
            isValid: item => this.isShape(item, shape),
            signal: "itemProduced",
        };
    }

    createSpeedOptions(level, time) {
        return {
            isValid: currentLevel => currentLevel >= level && this.root.time.now() < time,
            signal: "storyGoalCompleted",
        };
    }

    createTimeOptions(duration) {
        return {
            isValid: () => this.root.time.now() >= duration,
        };
    }

    createUpgradeOptions(tier) {
        return {
            init: ({ key }) => this.unlock(key, null),
            isValid: () => this.hasAllUpgradesAtLeastAtTier(tier),
            signal: "upgradePurchased",
        };
    }

    /**
 @param entity
*/
    isBelt500TilesValid(entity: Entity): boolean {
        return entity.components.Belt && entity.components.Belt.assignedPath.totalLength >= 500;
    }

    isDarkModeValid(): boolean {
        return this.root.app.settings.currentData.settings.theme === DARK_MODE;
    }

    /**
 @param count
*/
    isDestroy1000Valid(count: number): boolean {
        return count >= 1000;
    }

    /**
 @param definition
*/
    isIrrelevantShapeValid(definition: ShapeDefinition): boolean {
        const levels = this.root.gameMode.getLevelDefinitions();
        for (let i = 0; i < levels.length; i++) {
            if (definition.cachedHash === levels[i].shape) {
                return false;
            }
        }

        const upgrades = this.root.gameMode.getUpgrades();
        for (let upgradeId in upgrades) {
            for (const tier in upgrades[upgradeId]) {
                const requiredShapes = upgrades[upgradeId][tier].required;
                for (let i = 0; i < requiredShapes.length; i++) {
                    if (definition.cachedHash === requiredShapes[i].shape) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    /**
 @param item
*/
    isLogoBefore18Valid(item: ShapeItem): boolean {
        return this.root.hubGoals.level < 18 && this.isShape(item, SHAPE_LOGO);
    }

    isMamValid(): boolean {
        return this.root.hubGoals.level > 27 && !this.root.savegame.currentData.stats.failedMam;
    }

    /**
 @param count
*/
    isMapMarkers15Valid(count: number): boolean {
        return count >= 15;
    }

    isNoBeltUpgradesUntilBpValid(level: number): boolean {
        return level >= 12 && this.root.hubGoals.upgradeLevels.belt === 0;
    }

    initNoInverseRotater() {
        if (this.root.savegame.currentData.stats.usedInverseRotater === true) {
            return;
        }

        const entities = this.root.entityMgr.componentToEntity.StaticMapEntity;

        let usedInverseRotater = false;
        for (var i = 0; i < entities.length; i++) {
            const entity = entities[i].components.StaticMapEntity;

            if (entity.code === ROTATER_CCW_CODE || entity.code === ROTATER_180_CODE) {
                usedInverseRotater = true;
                break;
            }
        }

        this.root.savegame.currentData.stats.usedInverseRotater = usedInverseRotater;
    }

    /**
 @param level
*/
    isNoInverseRotaterValid(level: number): boolean {
        return level >= 14 && !this.root.savegame.currentData.stats.usedInverseRotater;
    }

    /**
 @param currentLayer
*/
    isOpenWiresValid(currentLayer: string): boolean {
        return currentLayer === WIRE_LAYER;
    }

    /**
 @param entity
*/
    isPlace5000WiresValid(entity: Entity): boolean {
        return (
            entity.components.Wire &&
            entity.registered &&
            entity.root.entityMgr.componentToEntity.Wire.length >= 5000
        );
    }

    /**
 @param count
*/
    isPlaceBlueprintValid(count: number): boolean {
        return count != 0;
    }

    /**
 @param count
*/
    isPlaceBp1000Valid(count: number): boolean {
        return count >= 1000;
    }

    /**
 @param item
*/
    isStack4LayersValid(item: ShapeItem): boolean {
        return item.getItemType() === ITEM_SHAPE && item.definition.layers.length === 4;
    }

    initStore100Unique({ key }: Achievement) {
        this.unlock(key, null);
    }

    isStore100UniqueValid(): boolean {
        return Object.keys(this.root.hubGoals.storedShapes).length >= 100;
    }

    initStoreShape({ key }: Achievement) {
        this.unlock(key, null);
    }

    isStoreShapeValid(): boolean {
        const entities = this.root.systemMgr.systems.storage.allEntities;

        if (entities.length === 0) {
            return false;
        }

        for (var i = 0; i < entities.length; i++) {
            if (entities[i].components.Storage.storedCount > 0) {
                return true;
            }
        }

        return false;
    }

    initTrash1000({ key }: Achievement) {
        if (Number(this.root.savegame.currentData.stats.trashedCount)) {
            this.unlock(key, 0);
            return;
        }

        this.root.savegame.currentData.stats.trashedCount = 0;
    }

    /**
 @param count
*/
    isTrash1000Valid(count: number): boolean {
        this.root.savegame.currentData.stats.trashedCount += count;

        return this.root.savegame.currentData.stats.trashedCount >= 1000;
    }
}
