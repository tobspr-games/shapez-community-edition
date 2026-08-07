import { T } from "../translations";
import { BUILDING_IDS } from "./building_identifiers";
import { enumBalancerVariants } from "./buildings/balancer";
import { enumCutterVariants } from "./buildings/cutter";
import { enumMinerVariants } from "./buildings/miner";
import { enumPainterVariants } from "./buildings/painter";
import { enumRotatorVariants } from "./buildings/rotator";
import { enumUndergroundBeltVariants } from "./buildings/underground_belt";
import { defaultBuildingVariant, MetaBuilding } from "./meta_building";
/** @typedef {Array<[typeof MetaBuilding, string]>} TutorialGoalReward */
import { enumHubGoalRewards } from "./tutorial_goals";

/**
 * Helper method for proper types
 *  @returns {TutorialGoalReward}
 */
const typed = x => x;

/**
 * Stores which reward unlocks what
 * @enum {TutorialGoalReward?}
 */
export const enumHubGoalRewardsToContentUnlocked = {
    [enumHubGoalRewards.reward_cutter_and_trash]: typed([[BUILDING_IDS.cutter, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_rotator]: typed([[BUILDING_IDS.rotator, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_painter]: typed([[BUILDING_IDS.painter, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_mixer]: typed([[BUILDING_IDS.mixer, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_stacker]: typed([[BUILDING_IDS.stacker, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_balancer]: typed([[BUILDING_IDS.balancer, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_tunnel]: typed([[BUILDING_IDS.undergroundBelt, defaultBuildingVariant]]),

    [enumHubGoalRewards.reward_rotator_ccw]: typed([[BUILDING_IDS.rotator, enumRotatorVariants.ccw]]),
    [enumHubGoalRewards.reward_rotator_180]: typed([[BUILDING_IDS.rotator, enumRotatorVariants.rotate180]]),
    [enumHubGoalRewards.reward_miner_chainable]: typed([[BUILDING_IDS.miner, enumMinerVariants.chainable]]),
    [enumHubGoalRewards.reward_underground_belt_tier_2]: typed([
        [BUILDING_IDS.undergroundBelt, enumUndergroundBeltVariants.tier2],
    ]),
    [enumHubGoalRewards.reward_splitter]: typed([[BUILDING_IDS.balancer, enumBalancerVariants.splitter]]),
    [enumHubGoalRewards.reward_merger]: typed([[BUILDING_IDS.balancer, enumBalancerVariants.merger]]),
    [enumHubGoalRewards.reward_cutter_quad]: typed([[BUILDING_IDS.cutter, enumCutterVariants.quad]]),
    [enumHubGoalRewards.reward_painter_double]: typed([[BUILDING_IDS.painter, enumPainterVariants.double]]),
    [enumHubGoalRewards.reward_storage]: typed([[BUILDING_IDS.storage, defaultBuildingVariant]]),

    [enumHubGoalRewards.reward_belt_reader]: typed([[BUILDING_IDS.reader, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_display]: typed([[BUILDING_IDS.display, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_constant_signal]: typed([
        [BUILDING_IDS.constantSignal, defaultBuildingVariant],
    ]),
    [enumHubGoalRewards.reward_logic_gates]: typed([[BUILDING_IDS.logicGate, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_filter]: typed([[BUILDING_IDS.filter, defaultBuildingVariant]]),
    [enumHubGoalRewards.reward_virtual_processing]: null,

    [enumHubGoalRewards.reward_wires_painter_and_levers]: typed([
        [BUILDING_IDS.painter, enumPainterVariants.quad],
    ]),
    [enumHubGoalRewards.reward_freeplay]: null,
    [enumHubGoalRewards.reward_blueprints]: null,
    [enumHubGoalRewards.no_reward]: null,
    [enumHubGoalRewards.no_reward_freeplay]: null,
    [enumHubGoalRewards.reward_demo_end]: null,
};

if (G_IS_DEV) {
    // Sanity check
    for (const rewardId in enumHubGoalRewards) {
        const mapping = enumHubGoalRewardsToContentUnlocked[rewardId];

        if (typeof mapping === "undefined") {
            assertAlways(
                false,
                "Please define a mapping for the reward " + rewardId + " in tutorial_goals_mappings.js"
            );
        }

        const translation = T.storyRewards[rewardId];
        if (!translation || !translation.title || !translation.desc) {
            assertAlways(false, "Translation for reward " + rewardId + "missing");
        }
    }
}
