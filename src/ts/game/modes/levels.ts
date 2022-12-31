/* typehints:start */
import type { Application } from "../../application";
/* typehints:end */
import { WEB_STEAM_SSO_AUTHENTICATED } from "../../core/steam_sso";
import { enumHubGoalRewards } from "../tutorial_goals";

export const finalGameShape = "RuCw--Cw:----Ru--";

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

const WEB_DEMO_LEVELS = (app: Application) => {
    const levels = [
        // 1
        // Circle
        {
            shape: "CuCuCuCu",
            required: 10,
            reward: enumHubGoalRewards.reward_cutter_and_trash,
        },

        // 2
        // Cutter
        {
            shape: "----CuCu",
            required: 20,
            reward: enumHubGoalRewards.no_reward,
        },

        // 3
        // Rectangle
        {
            shape: "RuRuRuRu",
            required: 30,
            reward: enumHubGoalRewards.reward_balancer,
        },

        // 4
        {
            shape: "RuRu----",
            required: 30,
            reward: enumHubGoalRewards.reward_rotater,
        },

        // 5
        // Rotater
        {
            shape: "Cu----Cu",
            required: 75,
            reward: enumHubGoalRewards.reward_tunnel,
        },

        // 6
        // Painter
        {
            shape: "Cu------",
            required: 50,
            reward: enumHubGoalRewards.reward_painter,
        },

        // 7
        {
            shape: "CrCrCrCr",
            required: 85,
            reward: enumHubGoalRewards.reward_rotater_ccw,
        },

        // 8
        {
            shape: "RbRb----",
            required: 100,
            reward: enumHubGoalRewards.reward_mixer,
        },
        {
            shape: "RpRp----",
            required: 0,
            reward: enumHubGoalRewards.reward_demo_end,
        },
    ];

    return levels;
};

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

const STEAM_DEMO_LEVELS = () => [
    // 1
    // Circle
    {
        shape: "CuCuCuCu",
        required: 35,
        reward: enumHubGoalRewards.reward_cutter_and_trash,
    },

    // 2
    // Cutter
    {
        shape: "----CuCu",
        required: 45,
        reward: enumHubGoalRewards.no_reward,
    },

    // 3
    // Rectangle
    {
        shape: "RuRuRuRu",
        required: 90,
        reward: enumHubGoalRewards.reward_balancer,
    },

    // 4
    {
        shape: "RuRu----",
        required: 70,
        reward: enumHubGoalRewards.reward_rotater,
    },

    // 5
    // Rotater
    {
        shape: "Cu----Cu",
        required: 160,
        reward: enumHubGoalRewards.reward_tunnel,
    },

    // 6
    {
        shape: "Cu------",
        required: 160,
        reward: enumHubGoalRewards.reward_painter,
    },

    // 7
    // Painter
    {
        shape: "CrCrCrCr",
        required: 140,
        reward: enumHubGoalRewards.reward_rotater_ccw,
    },
    // 8
    {
        shape: "RbRb----",
        required: 225,
        reward: enumHubGoalRewards.reward_mixer,
    },
    // End of demo
    {
        shape: "CpCpCpCp",
        required: 0,
        reward: enumHubGoalRewards.reward_demo_end,
    },
];

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

const STANDALONE_LEVELS = () => [
    // 1
    // Circle
    {
        shape: "CuCuCuCu",
        required: 30,
        reward: enumHubGoalRewards.reward_cutter_and_trash,
    },

    // 2
    // Cutter
    {
        shape: "----CuCu",
        required: 40,
        reward: enumHubGoalRewards.no_reward,
    },

    // 3
    // Rectangle
    {
        shape: "RuRuRuRu",
        required: 70,
        reward: enumHubGoalRewards.reward_balancer,
    },

    // 4
    {
        shape: "RuRu----",
        required: 70,
        reward: enumHubGoalRewards.reward_rotater,
    },

    // 5
    // Rotater
    {
        shape: "Cu----Cu",
        required: 170,
        reward: enumHubGoalRewards.reward_tunnel,
    },

    // 6
    {
        shape: "Cu------",
        required: 270,
        reward: enumHubGoalRewards.reward_painter,
    },

    // 7
    // Painter
    {
        shape: "CrCrCrCr",
        required: 300,
        reward: enumHubGoalRewards.reward_rotater_ccw,
    },
    // 8
    {
        shape: "RbRb----",
        required: 480,
        reward: enumHubGoalRewards.reward_mixer,
    },
    // 9
    // Mixing (purple)
    {
        shape: "CpCpCpCp",
        required: 600,
        reward: enumHubGoalRewards.reward_merger,
    },

    // 10
    // STACKER: Star shape + cyan
    {
        shape: "ScScScSc",
        required: 800,
        reward: enumHubGoalRewards.reward_stacker,
    },

    // 11
    // Chainable miner
    {
        shape: "CgScScCg",
        required: 1000,
        reward: enumHubGoalRewards.reward_miner_chainable,
    },

    // 12
    // Blueprints
    {
        shape: "CbCbCbRb:CwCwCwCw",
        required: 1000,
        reward: enumHubGoalRewards.reward_blueprints,
    },
    // 13
    // Tunnel Tier 2
    {
        shape: "RpRpRpRp:CwCwCwCw",
        required: 3800,
        reward: enumHubGoalRewards.reward_underground_belt_tier_2,
    },

    // 14
    // Belt reader
    {
        shape: "--Cg----:--Cr----",
        required: 8,
        reward: enumHubGoalRewards.reward_belt_reader,
        throughputOnly: true,
    },

    // 15
    // Storage
    {
        shape: "SrSrSrSr:CyCyCyCy",
        required: 10000,
        reward: enumHubGoalRewards.reward_storage,
    },

    // 16
    // Quad Cutter
    {
        shape: "SrSrSrSr:CyCyCyCy:SwSwSwSw",
        required: 6000,
        reward: enumHubGoalRewards.reward_cutter_quad,
    },

    // 17
    // Double painter
    {
        shape: "CbRbRbCb:CwCwCwCw:WbWbWbWb",
        required: 20000,
        reward: enumHubGoalRewards.reward_painter_double,
    },

    // 18
    // Rotater (180deg)
    {
        shape: "Sg----Sg:CgCgCgCg:--CyCy--",
        required: 20000,
        reward: enumHubGoalRewards.reward_rotater_180,
    },

    // 19
    // Compact splitter
    {
        shape: "CpRpCp--:SwSwSwSw",
        required: 25000,
        reward: enumHubGoalRewards.reward_splitter,
    },

    // 20
    // WIRES
    {
        shape: finalGameShape,
        required: 25000,
        reward: enumHubGoalRewards.reward_wires_painter_and_levers,
    },

    // 21
    // Filter
    {
        shape: "CrCwCrCw:CwCrCwCr:CrCwCrCw:CwCrCwCr",
        required: 25000,
        reward: enumHubGoalRewards.reward_filter,
    },

    // 22
    // Constant signal
    {
        shape: "Cg----Cr:Cw----Cw:Sy------:Cy----Cy",
        required: 25000,
        reward: enumHubGoalRewards.reward_constant_signal,
    },

    // 23
    // Display
    {
        shape: "CcSyCcSy:SyCcSyCc:CcSyCcSy",
        required: 25000,
        reward: enumHubGoalRewards.reward_display,
    },

    // 24 Logic gates
    {
        shape: "CcRcCcRc:RwCwRwCw:Sr--Sw--:CyCyCyCy",
        required: 25000,
        reward: enumHubGoalRewards.reward_logic_gates,
    },

    // 25 Virtual Processing
    {
        shape: "Rg--Rg--:CwRwCwRw:--Rg--Rg",
        required: 25000,
        reward: enumHubGoalRewards.reward_virtual_processing,
    },

    // 26 Freeplay
    {
        shape: "CbCuCbCu:Sr------:--CrSrCr:CwCwCwCw",
        required: 50000,
        reward: enumHubGoalRewards.reward_freeplay,
    },
];

/** Generates the level definitions */
export function generateLevelsForVariant(app) {
    if (G_IS_STANDALONE || WEB_STEAM_SSO_AUTHENTICATED) {
        return STANDALONE_LEVELS();
    }
    return WEB_DEMO_LEVELS(app);
}
