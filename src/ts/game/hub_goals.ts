import { globalConfig } from "../core/config";
import { RandomNumberGenerator } from "../core/rng";
import { clamp } from "../core/utils";
import { BasicSerializableObject, types } from "../savegame/serialization";
import { enumColors } from "./colors";
import { enumItemProcessorTypes } from "./components/item_processor";
import { enumAnalyticsDataSource } from "./production_analytics";
import { GameRoot } from "./root";
import { enumSubShape, ShapeDefinition } from "./shape_definition";
import { enumHubGoalRewards } from "./tutorial_goals";

export const MOD_ITEM_PROCESSOR_SPEEDS = {};

export class HubGoals extends BasicSerializableObject {
    static getId() {
        return "HubGoals";
    }

    static getSchema() {
        return {
            level: types.uint,
            storedShapes: types.keyValueMap(types.uint),
            upgradeLevels: types.keyValueMap(types.uint),
        };
    }

    deserialize(data: any, root: GameRoot) {
        const errorCode = super.deserialize(data);
        if (errorCode) {
            return errorCode;
        }

        const levels = root.gameMode.getLevelDefinitions();

        // If freeplay is not available, clamp the level
        if (!root.gameMode.getIsFreeplayAvailable()) {
            this.level = Math.min(this.level, levels.length);
        }

        // Compute gained rewards
        for (let i = 0; i < this.level - 1; ++i) {
            if (i < levels.length) {
                const reward = levels[i].reward;
                this.gainedRewards[reward] = (this.gainedRewards[reward] || 0) + 1;
            }
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

    public level = 1;

    /** Which story rewards we already gained */
    public gainedRewards: {
        [idx: string]: number;
    } = {};

    /** Mapping from shape hash -> amount */
    public storedShapes: {
        [idx: string]: number;
    } = {};

    /** Stores the levels for all upgrades */
    public upgradeLevels: {
        [idx: string]: number;
    } = {};

    /** Stores the improvements for all upgrades */
    public upgradeImprovements: {
        [idx: string]: number;
    } = {};

    public currentGoal: {
        definition: ShapeDefinition;
        required: number;
        reward: enumHubGoalRewards;
        throughputOnly: boolean;
    };

    constructor(public root: GameRoot) {
        super();

        // Reset levels first
        const upgrades = this.root.gameMode.getUpgrades();
        for (const key in upgrades) {
            this.upgradeLevels[key] = 0;
            this.upgradeImprovements[key] = 1;
        }

        this.computeNextGoal();

        // Allow quickly switching goals in dev mode
        if (G_IS_DEV) {
            window.addEventListener("keydown", ev => {
                if (ev.key === "p") {
                    // root is not guaranteed to exist within ~0.5s after loading in
                    if (this.root && this.root.app && this.root.app.gameAnalytics) {
                        if (!this.isEndOfDemoReached()) {
                            this.onGoalCompleted();
                        }
                    }
                }
            });
        }
    }

    /** Returns whether the end of the demo is reached */
    isEndOfDemoReached(): boolean {
        return (
            !this.root.gameMode.getIsFreeplayAvailable() &&
            this.level >= this.root.gameMode.getLevelDefinitions().length
        );
    }

    /** Returns how much of the current shape is stored */
    getShapesStored(definition: ShapeDefinition): number {
        return this.storedShapes[definition.getHash()] || 0;
    }

    takeShapeByKey(key: string, amount: number) {
        assert(this.getShapesStoredByKey(key) >= amount, "Can not afford: " + key + " x " + amount);
        assert(amount >= 0, "Amount < 0 for " + key);
        assert(Number.isInteger(amount), "Invalid amount: " + amount);
        this.storedShapes[key] = (this.storedShapes[key] || 0) - amount;
        return;
    }

    /** Returns how much of the current shape is stored */
    getShapesStoredByKey(key: string): number {
        return this.storedShapes[key] || 0;
    }

    /** Returns how much of the current goal was already delivered */
    getCurrentGoalDelivered() {
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

    /** Returns the current level of a given upgrade */
    getUpgradeLevel(upgradeId: string) {
        return this.upgradeLevels[upgradeId] || 0;
    }

    /** Returns whether the given reward is already unlocked */
    isRewardUnlocked(reward: enumHubGoalRewards) {
        if (G_IS_DEV && globalConfig.debug.allBuildingsUnlocked) {
            return true;
        }
        if (
            reward === enumHubGoalRewards.reward_blueprints &&
            this.root.app.restrictionMgr.isLimitedVersion()
        ) {
            return false;
        }

        if (this.root.gameMode.getLevelDefinitions().length < 1) {
            // no story, so always unlocked
            return true;
        }
        return !!this.gainedRewards[reward];
    }

    /**
     * Handles the given definition, by either accounting it towards the
     * goal or otherwise granting some points
     */
    handleDefinitionDelivered(definition: ShapeDefinition) {
        const hash = definition.getHash();
        this.storedShapes[hash] = (this.storedShapes[hash] || 0) + 1;

        this.root.signals.shapeDelivered.dispatch(definition);

        // Check if we have enough for the next level
        if (
            this.getCurrentGoalDelivered() >= this.currentGoal.required ||
            (G_IS_DEV && globalConfig.debug.rewardsInstant)
        ) {
            if (!this.isEndOfDemoReached()) {
                this.onGoalCompleted();
            }
        }
    }

    /** Creates the next goal */
    computeNextGoal() {
        const storyIndex = this.level - 1;
        const levels = this.root.gameMode.getLevelDefinitions();
        if (storyIndex < levels.length) {
            const { shape, required, reward, throughputOnly } = levels[storyIndex];
            this.currentGoal = {
                definition: this.root.shapeDefinitionMgr.getShapeFromShortKey(shape),
                required,
                reward,
                throughputOnly,
            };
            return;
        }

        //Floor Required amount to remove confusion
        const required = Math.min(200, Math.floor(4 + (this.level - 27) * 0.25));
        this.currentGoal = {
            definition: this.computeFreeplayShape(this.level),
            required,
            reward: enumHubGoalRewards.no_reward_freeplay,
            throughputOnly: true,
        };
    }

    /** Called when the level was completed */
    onGoalCompleted() {
        const reward = this.currentGoal.reward;
        this.gainedRewards[reward] = (this.gainedRewards[reward] || 0) + 1;

        this.root.app.gameAnalytics.handleLevelCompleted(this.level);
        ++this.level;
        this.computeNextGoal();

        this.root.signals.storyGoalCompleted.dispatch(this.level - 1, reward);
    }

    /** Returns whether we are playing in free-play */
    isFreePlay() {
        return this.level >= this.root.gameMode.getLevelDefinitions().length;
    }

    /** Returns whether a given upgrade can be unlocked */
    canUnlockUpgrade(upgradeId: string) {
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

    /** Returns the number of available upgrades */
    getAvailableUpgradeCount(): number {
        let count = 0;
        for (const upgradeId in this.root.gameMode.getUpgrades()) {
            if (this.canUnlockUpgrade(upgradeId)) {
                ++count;
            }
        }
        return count;
    }

    /** Tries to unlock the given upgrade */
    tryUnlockUpgrade(upgradeId: string): boolean {
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

    /** Picks random colors which are close to each other */
    generateRandomColorSet(rng: RandomNumberGenerator, allowUncolored = false) {
        const colorWheel: enumColors[] = [
            enumColors.red,
            enumColors.yellow,
            enumColors.green,
            enumColors.cyan,
            enumColors.blue,
            enumColors.purple,
            enumColors.red,
            enumColors.yellow,
        ];

        const universalColors: enumColors[] = [enumColors.white];
        if (allowUncolored) {
            universalColors.push(enumColors.uncolored);
        }
        const index = rng.nextIntRange(0, colorWheel.length - 2);
        const pickedColors = colorWheel.slice(index, index + 3);
        pickedColors.push(rng.choice(universalColors));
        return pickedColors;
    }

    /** Creates a (seeded) random shape */
    computeFreeplayShape(level: number): ShapeDefinition {
        const layerCount = clamp(this.level / 25, 2, 4);

        let layers: Array<import("./shape_definition").ShapeLayer> = [];

        const rng = new RandomNumberGenerator(this.root.map.seed + "/" + level);

        const colors = this.generateRandomColorSet(rng, level > 35);

        let pickedSymmetry = null; // pairs of quadrants that must be the same
        let availableShapes: enumSubShape[] = [enumSubShape.rect, enumSubShape.circle, enumSubShape.star];
        if (rng.next() < 0.5) {
            pickedSymmetry = [
                // radial symmetry
                [0, 2],
                [1, 3],
            ];
            availableShapes.push(enumSubShape.windmill); // windmill looks good only in radial symmetry
        } else {
            const symmetries = [
                [
                    // horizontal axis
                    [0, 3],
                    [1, 2],
                ],
                [
                    // vertical axis
                    [0, 1],
                    [2, 3],
                ],
                [
                    // diagonal axis
                    [0, 2],
                    [1],
                    [3],
                ],
                [
                    // other diagonal axis
                    [1, 3],
                    [0],
                    [2],
                ],
            ];
            pickedSymmetry = rng.choice(symmetries);
        }

        const randomColor = () => rng.choice(colors);
        const randomShape = () => rng.choice(availableShapes);

        let anyIsMissingTwo = false;

        for (let i = 0; i < layerCount; ++i) {
            const layer: import("./shape_definition").ShapeLayer = [null, null, null, null];

            for (let j = 0; j < pickedSymmetry.length; ++j) {
                const group = pickedSymmetry[j];
                const shape = randomShape();
                const color = randomColor();
                for (let k = 0; k < group.length; ++k) {
                    const quad = group[k];
                    layer[quad] = {
                        subShape: shape,
                        color,
                    };
                }
            }

            // Sometimes they actually are missing *two* ones!
            // Make sure at max only one layer is missing it though, otherwise we could
            // create an uncreateable shape
            if (level > 75 && rng.next() > 0.95 && !anyIsMissingTwo) {
                layer[rng.nextIntRange(0, 4)] = null;
                anyIsMissingTwo = true;
            }

            layers.push(layer);
        }

        const definition = new ShapeDefinition({ layers });
        return this.root.shapeDefinitionMgr.registerOrReturnHandle(definition);
    }

    ////////////// HELPERS

    /**
     * Belt speed
     * @returns items / sec
     */
    getBeltBaseSpeed(): number {
        if (this.root.gameMode.throughputDoesNotMatter()) {
            return globalConfig.beltSpeedItemsPerSecond * globalConfig.puzzleModeSpeed;
        }
        return globalConfig.beltSpeedItemsPerSecond * this.upgradeImprovements.belt;
    }

    /**
     * Underground belt speed
     * @returns items / sec
     */
    getUndergroundBeltBaseSpeed(): number {
        if (this.root.gameMode.throughputDoesNotMatter()) {
            return globalConfig.beltSpeedItemsPerSecond * globalConfig.puzzleModeSpeed;
        }
        return globalConfig.beltSpeedItemsPerSecond * this.upgradeImprovements.belt;
    }

    /**
     * Miner speed
     * @returns items / sec
     */
    getMinerBaseSpeed(): number {
        if (this.root.gameMode.throughputDoesNotMatter()) {
            return globalConfig.minerSpeedItemsPerSecond * globalConfig.puzzleModeSpeed;
        }
        return globalConfig.minerSpeedItemsPerSecond * this.upgradeImprovements.miner;
    }

    /**
     * Processor speed
     * @returns items / sec
     */
    getProcessorBaseSpeed(processorType: enumItemProcessorTypes): number {
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
