import { resolve } from "path/posix";
import rspack from "@rspack/core";
import { getAllResourceImages, getRevision, getVersion } from "./buildutils.js";
import { buildFolder } from "./config.js";

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

/** @type {import("@rspack/core").RuleSetRule[]} */
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
                loader: "builtin:swc-loader",
                /** @type {import('@rspack/core').SwcLoaderOptions} */
                options: {
                    jsc: {
                        target: "es2024",
                        transform: {
                            react: {
                                runtime: "automatic",
                                importSource: "@",
                            },
                        },
                    },
                },
            },
        ],
        resolve: {
            fullySpecified: false,
        },
    },
];

/** @type {import("@rspack/core").Configuration} */
export default {
    mode: "production",
    entry: resolve("../src/js/main.js"),
    context: resolve(".."),
    output: {
        path: buildFolder,
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
            new rspack.SwcJsMinimizerRspackPlugin({
                minimizerOptions: {
                    ecma: 2020,
                    module: true,
                    mangle: {
                        keep_fnames: true,
                    },
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
        new rspack.DefinePlugin(globalDefs),
        new rspack.IgnorePlugin({ resourceRegExp: /\.(png|jpe?g|svg)$/ }),
        new rspack.IgnorePlugin({ resourceRegExp: /\.nobuild/ }),
    ],
    module: { rules: moduleRules },
    performance: {
        maxEntrypointSize: 5120000,
        maxAssetSize: 5120000,
    },
};
