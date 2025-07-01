import { resolve } from "path/posix";
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";
import DeadCodePlugin from "webpack-deadcode-plugin";
import { getAllResourceImages, getRevision, getVersion } from "./buildutils.js";
const { DefinePlugin, IgnorePlugin } = webpack;

const globalDefs = {
    "assert": "false && window.assert",
    "assertAlways": "window.assert",
    "abstract": "window.assert(false, 'abstract method called');",
    "globalConfig.debug": "({})",
    "G_IS_DEV": "false",
    "G_APP_ENVIRONMENT": JSON.stringify("release"),
    "G_BUILD_TIME": new Date().getTime().toString(),
    "G_BUILD_COMMIT_HASH": JSON.stringify(getRevision()),
    "G_BUILD_VERSION": JSON.stringify(getVersion()),
    "G_ALL_UI_IMAGES": JSON.stringify(getAllResourceImages()),

    "G_IS_RELEASE": "true",
};

/** @type {import("webpack").RuleSetRule[]} */
const moduleRules = [
    {
        test: /\.jsx?$/,
        enforce: "pre",
        exclude: /node_modules/,
        use: [
            {
                loader: "webpack-strip-block",
                options: {
                    start: "typehints:start",
                    end: "typehints:end",
                },
            },
            {
                // TODO: Consider removing this separation
                loader: "webpack-strip-block",
                options: {
                    start: "dev:start",
                    end: "dev:end",
                },
            },
        ],
    },
    {
        test: /\.[jt]sx?$/,
        use: [
            {
                loader: "ts-loader",

                options: {
                    configFile: resolve("../src/tsconfig.json"),
                    onlyCompileBundledFiles: true,
                    transpileOnly: true,
                    experimentalWatchApi: true,
                },
            },
        ],
        resolve: {
            fullySpecified: false,
        },
    },
];

/** @type {import("webpack").Configuration} */
export default {
    mode: "production",
    entry: resolve("../src/js/main.js"),
    context: resolve(".."),
    output: {
        path: resolve("../build"),
        filename: "bundle.js",
    },
    resolve: {
        fallback: { fs: false },
        alias: {
            "@": resolve("../src/js/"),
        },
        fullySpecified: false,
        extensions: [".ts", ".js", ".tsx", ".jsx"],
    },
    stats: { optimizationBailout: true },
    optimization: {
        removeAvailableModules: true,
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    ecma: 2020,
                    module: true,
                    keep_fnames: true,
                    compress: {
                        global_defs: globalDefs,
                        keep_infinity: true,
                        passes: 2,
                        pure_funcs: [
                            "Math.radians",
                            "Math.degrees",
                            "Math.round",
                            "Math.ceil",
                            "Math.floor",
                            "Math.sqrt",
                            "Math.hypot",
                            "Math.abs",
                            "Math.max",
                            "Math.min",
                            "Math.sin",
                            "Math.cos",
                            "Math.tan",
                            "Math.sign",
                            "Math.pow",
                            "Math.atan2",
                        ],
                        unsafe_math: true,
                    },
                    format: {
                        comments: false,
                        ascii_only: true,
                    },
                },
            }),
        ],
    },
    plugins: [
        new DefinePlugin(globalDefs),
        new IgnorePlugin({ resourceRegExp: /\.(png|jpe?g|svg)$/ }),
        new IgnorePlugin({ resourceRegExp: /\.nobuild/ }),
        new DeadCodePlugin({
            patterns: ["../src/js/**/*.js"],
        }),
    ],
    module: { rules: moduleRules },
    performance: {
        maxEntrypointSize: 5120000,
        maxAssetSize: 5120000,
    },
};
