import debug from "./config.local";

export const THIRDPARTY_URLS = {
    discord: "https://discord.gg/HN7EVzV",
    github: "https://github.com/tobspr-games/shapez.io",
    reddit: "https://www.reddit.com/r/shapezio",
    shapeViewer: "https://viewer.shapez.io",

    patreon: "https://www.patreon.com/tobsprgames",
    privacyPolicy: "https://tobspr.io/privacy.html",

    levelTutorialVideos: {
        21: "https://www.youtube.com/watch?v=0nUfRLMCcgo&",
        25: "https://www.youtube.com/watch?v=7OCV1g40Iew&",
        26: "https://www.youtube.com/watch?v=gfm6dS1dCoY",
    },
};

export const globalConfig = {
    /** Size of a single tile in Pixels. */
    tileSize: 32,
    halfTileSize: 16,

    // Which dpi the assets have
    assetsDpi: 192 / 32,
    assetsSharpness: 1.5,
    shapesSharpness: 1.3,

    // Production analytics
    statisticsGraphDpi: 2.5,
    statisticsGraphSlices: 100,
    analyticsSliceDurationSeconds: G_IS_DEV ? 1 : 10,

    // Map
    /** width of a chunk in tiles */
    mapChunkSize: 16,
    /** width of an aggregate in chunks */
    chunkAggregateSize: 4,
    mapChunkOverviewMinZoom: 0.9,
    mapChunkWorldSize: null, // COMPUTED

    maxBeltShapeBundleSize: 20,

    // Belt speeds
    beltSpeedItemsPerSecond: 2,
    minerSpeedItemsPerSecond: 0, // COMPUTED

    defaultItemDiameter: 20,

    /** how many tiles of width each item takes up on a belt */
    itemSpacingOnBelts: 0.63,

    undergroundBeltMaxTilesByTier: [5, 9],

    readerAnalyzeIntervalSeconds: 10,

    goalAcceptorItemsRequired: 12,
    goalAcceptorsPerProducer: 5,
    puzzleModeSpeed: 3,
    puzzleMinBoundsSize: 2,
    puzzleMaxBoundsSize: 20,
    puzzleValidationDurationSeconds: 30,

    buildingRatios: {
        cutter: 4,
        cutterQuad: 4,
        painter: 6,
        painterDouble: 8,
        painterQuad: 2,
        mixer: 5,
        stacker: 8,
    },

    warmupTimeSecondsFast: 0.25,
    warmupTimeSecondsRegular: 0.25,

    smoothing: {
        smoothMainCanvas: true,
        quality: "low" as ImageSmoothingQuality, // Low is CRUCIAL for mobile performance!
    },

    debug,
};

export const IS_MOBILE = navigator.userAgentData.mobile;
export const SUPPORT_TOUCH = IS_MOBILE;

// Automatic calculations
globalConfig.minerSpeedItemsPerSecond = globalConfig.beltSpeedItemsPerSecond / 5;

globalConfig.mapChunkWorldSize = globalConfig.mapChunkSize * globalConfig.tileSize;

// Dynamic calculations
if (globalConfig.debug.disableMapOverview) {
    globalConfig.mapChunkOverviewMinZoom = 0;
}

if (globalConfig.debug.fastGameEnter) {
    globalConfig.debug.noArtificialDelays = true;
}

if (G_IS_DEV && globalConfig.debug.noArtificialDelays) {
    globalConfig.warmupTimeSecondsFast = 0;
    globalConfig.warmupTimeSecondsRegular = 0;
}
