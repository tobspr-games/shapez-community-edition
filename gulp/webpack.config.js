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
            "@": resolve("../src/js/"),
        },
        fullySpecified: false,
        extensions: [".ts", ".js", ".tsx", ".jsx"],
    },
    devtool: "cheap-source-map",
    cache: false,
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
};
