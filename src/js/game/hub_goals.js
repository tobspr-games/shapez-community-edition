import { globalConfig } from "../core/config";
import { RandomNumberGenerator } from "../core/rng";
import { clamp } from "../core/utils";
import { BasicSerializableObject, types } from "../savegame/serialization";
import { enumColors } from "./colors";
import { enumItemProcessorTypes } from "./components/item_processor";
import { FreeplayShape } from "./freeplay_shape";
import { enumAnalyticsDataSource } from "./production_analytics";
import { GameRoot } from "./root";
import { ShapeDefinition } from "./shape_definition";
import { enumHubGoalRewards } from "./tutorial_goals";

export const MOD_ITEM_PROCESSOR_SPEEDS = {};

export class HubGoals extends BasicSerializableObject {
    static getId() {
        return "HubGoals";
    }

    static getSchema() {
        return {
            chapter: types.nullable(types.string),
            completed: types.array(types.pair(types.string, types.string)),
            storedShapes: types.keyValueMap(types.uint),
            upgradeLevels: types.keyValueMap(types.uint),
        };
    }

    /**
     *
     * @param {*} data
     * @param {GameRoot} root
     */
    deserialize(data, root) {
        const errorCode = super.deserialize(data);
        if (errorCode) {
            return errorCode;
        }

        const levels = root.gameMode.getLevelSet();

        // Compute gained rewards
        for (let i = 0; i < this.completed.length; ++i) {
            const completed = this.completed[i];
            const chapter = levels.chapters.find(x => x.id === completed[0]);
            if (!chapter) continue;
            const goal = chapter.goals.find(x => x.id === completed[1]);
            if (!goal) continue;
            chapter.setGoalCompleted(goal.id);
            this.gainedRewards[goal.reward] = (this.gainedRewards[goal.reward] || 0) + 1;
        }

        if (!levels.setActiveChapter(data.chapter)) {
            this.chapter = levels.activeChapterId;
        }

        // Compute upgrade improvements
        const upgrades = this.root.gameMode.getUpgrades();
        for (const upgradeId in upgrades) {
            const tiers = upgrades[upgradeId];
            const level = this.upgradeLevels[upgradeId] || 0;
            let totalImprovement = 1;
            for (let i = 0; i < level; ++i) {
                totalImprovement += tiers[i].improvement;
            }
            this.upgradeImprovements[upgradeId] = totalImprovement;
        }

        // Compute current goal
        this.computeNextGoal();
    }

    /**
     * @param {GameRoot} root
     */
    constructor(root) {
        super();

        this.root = root;

        /**
         * @type {[string, string][]}
         */
        this.completed = [];

        /**
         * @type {string | null}
         */
        this.chapter = null;

        /**
         * Which story rewards we already gained
         * @type {Object.<string, number>}
         */
        this.gainedRewards = {};

        /**
         * Mapping from shape hash -> amount
         * @type {Object<string, number>}
         */
        this.storedShapes = {};

        /**
         * Stores the levels for all upgrades
         * @type {Object<string, number>}
         */
        this.upgradeLevels = {};

        /**
         * Stores the improvements for all upgrades
         * @type {Object<string, number>}
         */
        this.upgradeImprovements = {};

        // Reset levels first
        const upgrades = this.root.gameMode.getUpgrades();
        for (const key in upgrades) {
            this.upgradeLevels[key] = 0;
            this.upgradeImprovements[key] = 1;
        }

        /** @type {{ definition: ShapeDefinition, required: number, reward: string | null, throughputOnly: boolean} | null} */
        this.currentGoal = null;

        this.computeNextGoal();
        this.root.signals.chapterChanged.add(id => {
            this.chapter = id || "shapez:freeplay";
            this.computeNextGoal();
        });
    }

    /**
     * Returns whether the end of the demo is reached
     * @returns {boolean}
     */
    isEndOfDemoReached() {
        return (
            !this.root.gameMode.getIsFreeplayAvailable() &&
            this.root.gameMode.getLevelSet().getCompletedGoals().length >=
                this.root.gameMode.getLevelSet().getAllGoals().length
        );
    }

    /**
     * Returns how much of the current shape is stored
     * @param {ShapeDefinition} definition
     * @returns {number}
     */
    getShapesStored(definition) {
        return this.storedShapes[definition.getHash()] || 0;
    }

    /**
     * @param {string} key
     * @param {number} amount
     */
    takeShapeByKey(key, amount) {
        assert(this.getShapesStoredByKey(key) >= amount, "Can not afford: " + key + " x " + amount);
        assert(amount >= 0, "Amount < 0 for " + key);
        assert(Number.isInteger(amount), "Invalid amount: " + amount);
        this.storedShapes[key] = (this.storedShapes[key] || 0) - amount;
        return;
    }

    /**
     * Returns how much of the current shape is stored
     * @param {string} key
     * @returns {number}
     */
    getShapesStoredByKey(key) {
        return this.storedShapes[key] || 0;
    }

    /**
     * Returns how much of the current goal was already delivered
     */
    getCurrentGoalDelivered() {
        if (!this.currentGoal) return null;
        if (this.currentGoal.throughputOnly) {
            return (
                this.root.productionAnalytics.getCurrentShapeRateRaw(
                    enumAnalyticsDataSource.delivered,
                    this.currentGoal.definition
                ) / globalConfig.analyticsSliceDurationSeconds
            );
        }

        return this.getShapesStored(this.currentGoal.definition);
    }

    /**
     * Returns the current level of a given upgrade
     * @param {string} upgradeId
     */
    getUpgradeLevel(upgradeId) {
        return this.upgradeLevels[upgradeId] || 0;
    }

    /**
     * Returns whether the given reward is already unlocked
     * @param {enumHubGoalRewards} reward
     */
    isRewardUnlocked(reward) {
        if (G_IS_DEV && globalConfig.debug.allBuildingsUnlocked) {
            return true;
        }
        if (
            reward === enumHubGoalRewards.reward_blueprints &&
            this.root.app.restrictionMgr.isLimitedVersion()
        ) {
            return false;
        }

        if (this.root.gameMode.getLevelSet().getAllGoals().length < 1) {
            // no story, so always unlocked
            return true;
        }
        return !!this.gainedRewards[reward];
    }

    /**
     * Handles the given definition, by either accounting it towards the
     * goal or otherwise granting some points
     * @param {ShapeDefinition} definition
     */
    handleDefinitionDelivered(definition) {
        const hash = definition.getHash();
        this.storedShapes[hash] = (this.storedShapes[hash] || 0) + 1;

        this.root.signals.shapeDelivered.dispatch(definition);

        // Check if we have enough for the next level
        if (
            this.currentGoal &&
            (this.getCurrentGoalDelivered() >= this.currentGoal.required ||
                (G_IS_DEV && globalConfig.debug.rewardsInstant))
        ) {
            if (!this.isEndOfDemoReached()) {
                this.onGoalCompleted();
            }
        }
    }

    /**
     * Creates the next goal
     */
    computeNextGoal() {
        const levels = this.root.gameMode.getLevelSet();
        if (levels.isCompleted() && !levels.getActiveChapter()) {
            const required = Math.min(200, Math.floor(4 + this.getFreeplayLevel() * 0.25));
            this.currentGoal = {
                definition: this.root.shapeDefinitionMgr.getShapeFromShortKey(
                    FreeplayShape.computeFreeplayShape(
                        "shapez:freeplay",
                        this.getFreeplayLevel().toString(),
                        this.root.map.seed,
                        {
                            colorsAllowed:
                                this.getFreeplayLevel() > 35
                                    ? [
                                          enumColors.red,
                                          enumColors.yellow,
                                          enumColors.green,
                                          enumColors.cyan,
                                          enumColors.blue,
                                          enumColors.purple,
                                          enumColors.red,
                                          enumColors.yellow,
                                          enumColors.white,
                                          enumColors.uncolored,
                                      ]
                                    : [
                                          enumColors.red,
                                          enumColors.yellow,
                                          enumColors.green,
                                          enumColors.cyan,
                                          enumColors.blue,
                                          enumColors.purple,
                                          enumColors.red,
                                          enumColors.yellow,
                                          enumColors.white,
                                      ],
                            layerCount: clamp(this.getFreeplayLevel() / 25, 2, 4),
                        }
                    )
                ),
                required,
                reward: enumHubGoalRewards.no_reward_freeplay,
                throughputOnly: true,
            };
            console.log(this.currentGoal);
        } else {
            const chapter = levels.getActiveChapter();

            if (chapter.isCompleted()) {
                const nextChapter = levels.getNextChapter(this.root.hud.parts.levels.getTree());
                if (!nextChapter) levels.disableActiveChapter();
                else levels.setActiveChapter(nextChapter.id);
                return;
            }

            const goal = levels.getActiveGoal();
            if (goal) {
                const { id, shape, required, reward, throughputOnly } = goal;
                this.currentGoal = {
                    /** @type {ShapeDefinition} */
                    definition: this.root.shapeDefinitionMgr.getShapeFromShortKey(
                        typeof shape === "string"
                            ? shape
                            : FreeplayShape.computeFreeplayShape(chapter.id, id, this.root.map.seed, shape)
                    ),
                    required,
                    reward,
                    throughputOnly,
                };
            } else {
                this.currentGoal = null;
            }
        }
    }

    /**
     * Called when the level was completed
     */
    onGoalCompleted() {
        const reward = this.currentGoal.reward;
        this.gainedRewards[reward] = (this.gainedRewards[reward] || 0) + 1;

        const levels = this.root.gameMode.getLevelSet();

        const goal = levels.getActiveGoal();
        if (goal) {
            this.root.app.gameAnalytics.handleLevelCompleted(goal);
            levels.getActiveChapter().setGoalCompleted(goal.id);
            this.completed.push([levels.getActiveChapter().id, goal.id]);
        } else {
            this.completed.push(["shapez:freeplay", this.getFreeplayLevel().toString()]);
        }

        this.root.signals.storyGoalCompleted.dispatch(
            goal
                ? levels.getActiveChapter().id + "-" + goal.id
                : "shapez:freeplay-" + this.getFreeplayLevel(),
            reward
        );

        this.computeNextGoal();
    }

    /**
     * Returns whether a given upgrade can be unlocked
     * @param {string} upgradeId
     */
    canUnlockUpgrade(upgradeId) {
        const tiers = this.root.gameMode.getUpgrades()[upgradeId];
        const currentLevel = this.getUpgradeLevel(upgradeId);

        if (currentLevel >= tiers.length) {
            // Max level
            return false;
        }

        if (G_IS_DEV && globalConfig.debug.upgradesNoCost) {
            return true;
        }

        const tierData = tiers[currentLevel];

        for (let i = 0; i < tierData.required.length; ++i) {
            const requirement = tierData.required[i];
            if ((this.storedShapes[requirement.shape] || 0) < requirement.amount) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns the number of available upgrades
     * @returns {number}
     */
    getAvailableUpgradeCount() {
        let count = 0;
        for (const upgradeId in this.root.gameMode.getUpgrades()) {
            if (this.canUnlockUpgrade(upgradeId)) {
                ++count;
            }
        }
        return count;
    }

    /**
     * Tries to unlock the given upgrade
     * @param {string} upgradeId
     * @returns {boolean}
     */
    tryUnlockUpgrade(upgradeId) {
        if (!this.canUnlockUpgrade(upgradeId)) {
            return false;
        }

        const upgradeTiers = this.root.gameMode.getUpgrades()[upgradeId];
        const currentLevel = this.getUpgradeLevel(upgradeId);

        const tierData = upgradeTiers[currentLevel];
        if (!tierData) {
            return false;
        }

        if (G_IS_DEV && globalConfig.debug.upgradesNoCost) {
            // Dont take resources
        } else {
            for (let i = 0; i < tierData.required.length; ++i) {
                const requirement = tierData.required[i];

                // Notice: Don't have to check for hash here
                this.storedShapes[requirement.shape] -= requirement.amount;
            }
        }

        this.upgradeLevels[upgradeId] = (this.upgradeLevels[upgradeId] || 0) + 1;
        this.upgradeImprovements[upgradeId] += tierData.improvement;

        this.root.signals.upgradePurchased.dispatch(upgradeId);

        this.root.app.gameAnalytics.handleUpgradeUnlocked(upgradeId, currentLevel);

        return true;
    }

    getFreeplayLevel() {
        const freeplay = this.completed.filter(x => x[0] === "shapez:freeplay");
        freeplay.sort((a, b) => Number(b[1]) - Number(a[1]));

        return freeplay[0] ? Number(freeplay[0][1]) + 1 : 0;
    }

    ////////////// HELPERS

    /**
     * Belt speed
     * @returns {number} items / sec
     */
    getBeltBaseSpeed() {
        if (this.root.gameMode.throughputDoesNotMatter()) {
            return globalConfig.beltSpeedItemsPerSecond * globalConfig.puzzleModeSpeed;
        }
        return globalConfig.beltSpeedItemsPerSecond * this.upgradeImprovements.belt;
    }

    /**
     * Underground belt speed
     * @returns {number} items / sec
     */
    getUndergroundBeltBaseSpeed() {
        if (this.root.gameMode.throughputDoesNotMatter()) {
            return globalConfig.beltSpeedItemsPerSecond * globalConfig.puzzleModeSpeed;
        }
        return globalConfig.beltSpeedItemsPerSecond * this.upgradeImprovements.belt;
    }

    /**
     * Miner speed
     * @returns {number} items / sec
     */
    getMinerBaseSpeed() {
        if (this.root.gameMode.throughputDoesNotMatter()) {
            return globalConfig.minerSpeedItemsPerSecond * globalConfig.puzzleModeSpeed;
        }
        return globalConfig.minerSpeedItemsPerSecond * this.upgradeImprovements.miner;
    }

    /**
     * Processor speed
     * @param {enumItemProcessorTypes} processorType
     * @returns {number} items / sec
     */
    getProcessorBaseSpeed(processorType) {
        if (this.root.gameMode.throughputDoesNotMatter()) {
            return globalConfig.beltSpeedItemsPerSecond * globalConfig.puzzleModeSpeed * 10;
        }

        switch (processorType) {
            case enumItemProcessorTypes.trash:
            case enumItemProcessorTypes.hub:
            case enumItemProcessorTypes.goal:
                return 1e30;
            case enumItemProcessorTypes.balancer:
                return globalConfig.beltSpeedItemsPerSecond * this.upgradeImprovements.belt * 2;
            case enumItemProcessorTypes.reader:
                return globalConfig.beltSpeedItemsPerSecond * this.upgradeImprovements.belt;

            case enumItemProcessorTypes.mixer:
            case enumItemProcessorTypes.painter:
            case enumItemProcessorTypes.painterDouble:
            case enumItemProcessorTypes.painterQuad: {
                assert(
                    globalConfig.buildingSpeeds[processorType],
                    "Processor type has no speed set in globalConfig.buildingSpeeds: " + processorType
                );
                return (
                    globalConfig.beltSpeedItemsPerSecond *
                    this.upgradeImprovements.painting *
                    globalConfig.buildingSpeeds[processorType]
                );
            }

            case enumItemProcessorTypes.cutter:
            case enumItemProcessorTypes.cutterQuad:
            case enumItemProcessorTypes.rotater:
            case enumItemProcessorTypes.rotaterCCW:
            case enumItemProcessorTypes.rotater180:
            case enumItemProcessorTypes.stacker: {
                assert(
                    globalConfig.buildingSpeeds[processorType],
                    "Processor type has no speed set in globalConfig.buildingSpeeds: " + processorType
                );
                return (
                    globalConfig.beltSpeedItemsPerSecond *
                    this.upgradeImprovements.processors *
                    globalConfig.buildingSpeeds[processorType]
                );
            }
            default:
                if (MOD_ITEM_PROCESSOR_SPEEDS[processorType]) {
                    return MOD_ITEM_PROCESSOR_SPEEDS[processorType](this.root);
                }
                assertAlways(false, "invalid processor type: " + processorType);
        }

        return 1 / globalConfig.beltSpeedItemsPerSecond;
    }
}
