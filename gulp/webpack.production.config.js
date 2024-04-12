import { resolve } from "path/posix";
import TerserPlugin from "terser-webpack-plugin";
import webpack from "webpack";
const { DefinePlugin, IgnorePlugin } = webpack;
import DeadCodePlugin from "webpack-deadcode-plugin";
import { getAllResourceImages, getRevision, getVersion } from "./buildutils.js";

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
    "G_IS_STANDALONE": "true",
    "G_IS_BROWSER": "false",
    "G_HAVE_ASSERT": "false",
};

/** @type {import("webpack").RuleSetRule[]} */
const moduleRules = [
    {
        test: /\.json$/,
        enforce: "pre",
        use: resolve("./loader.compressjson.cjs"),
        type: "javascript/auto",
    },
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
                    configFile: resolve("../src/js/tsconfig.json"),
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
    {
        test: /\.worker\.[jt]s$/,
        use: [
            {
                loader: "worker-loader",
                options: {
                    filename: "[fullhash].worker.js",
                    inline: "fallback",
                },
            },
        ],
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
            "global-compression": resolve("../src/js/core/lzstring.js"),
            "root": resolve("../src/js/"),
        },
        fullySpecified: false,
        extensions: [".ts", ".js", ".tsx", ".jsx"],
    },
    stats: { optimizationBailout: true },
    devtool: false,
    optimization: {
        noEmitOnErrors: true,
        removeAvailableModules: true,
        removeEmptyChunks: true,
        mergeDuplicateChunks: true,
        flagIncludedChunks: true,
        providedExports: true,
        usedExports: true,
        concatenateModules: true,
        sideEffects: true,
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    ecma: 2020,
                    parse: {},
                    module: true,
                    toplevel: true,
                    keep_classnames: true,
                    keep_fnames: true,
                    compress: {
                        arguments: false,
                        drop_console: false,
                        global_defs: globalDefs,
                        keep_fargs: true,
                        keep_infinity: true,
                        passes: 2,
                        module: true,
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
                        toplevel: true,
                        unsafe_math: true,
                        unsafe_arrows: false,
                    },
                    mangle: {
                        eval: true,
                        keep_classnames: true,
                        keep_fnames: true,
                        module: true,
                        toplevel: true,
                    },
                    output: {
                        comments: false,
                        ascii_only: true,
                        beautify: false,
                        braces: false,
                        ecma: 2020,
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
    experiments: {
        topLevelAwait: true,
    },
};
