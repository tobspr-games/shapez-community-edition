import { resolve } from "path/posix";
import rspack from "@rspack/core";
import { getAllResourceImages, getRevision, getVersion } from "./buildutils.js";
import { buildFolder } from "./config.js";

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
    mode: "development",
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
    devtool: "cheap-source-map",
    cache: false,
    plugins: [
        new rspack.DefinePlugin(globalDefs),
        new rspack.IgnorePlugin({ resourceRegExp: /\.(png|jpe?g|svg)$/ }),
        new rspack.IgnorePlugin({ resourceRegExp: /\.nobuild/ }),
        new rspack.CircularDependencyRspackPlugin({
            exclude: /node_modules/,
            failOnError: true,
        }),
    ],
    module: { rules: moduleRules },
};
