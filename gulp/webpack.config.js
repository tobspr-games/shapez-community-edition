import CircularDependencyPlugin from "circular-dependency-plugin";
import { resolve } from "path/posix";
import webpack from "webpack";
import { getAllResourceImages, getRevision, getVersion } from "./buildutils.js";

const globalDefs = {
    assert: "window.assert",
    assertAlways: "window.assert",
    abstract:
        "window.assert(false, 'abstract method called of: ' + " +
        "(this.name || (this.constructor && this.constructor.name)));",
    G_IS_DEV: "true",
    G_APP_ENVIRONMENT: JSON.stringify("development"),
    G_BUILD_TIME: new Date().getTime().toString(),
    G_BUILD_COMMIT_HASH: JSON.stringify(getRevision()),
    G_BUILD_VERSION: JSON.stringify(getVersion()),
    G_ALL_UI_IMAGES: JSON.stringify(getAllResourceImages()),

    G_IS_RELEASE: "false",
    G_IS_STANDALONE: "true",
    G_IS_BROWSER: "false",
    G_HAVE_ASSERT: "true",
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
        test: /\.js$/,
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
        ],
    },
    {
        test: /\.worker\.js$/,
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
    {
        test: /\.js$/,
        resolve: {
            fullySpecified: false,
        },
    },
];

/** @type {import("webpack").Configuration} */
export default {
    mode: "development",
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
        },
    },
    devtool: "cheap-source-map",
    watch: true,
    plugins: [
        new webpack.DefinePlugin(globalDefs),
        new webpack.IgnorePlugin({ resourceRegExp: /\.(png|jpe?g|svg)$/ }),
        new webpack.IgnorePlugin({ resourceRegExp: /\.nobuild/ }),
        new CircularDependencyPlugin({
            exclude: /node_modules/,
            failOnError: true,
            allowAsyncCycles: false,
            cwd: resolve("../src/js"),
        }),
    ],
    module: { rules: moduleRules },
    experiments: {
        topLevelAwait: true,
    },
};
