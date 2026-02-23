import { rspack } from "@rspack/core";
import { BUILD_VARIANTS } from "./build_variants.js";

import rspackConfig from "./rspack.config.js";
import rspackProductionConfig from "./rspack.production.config.js";

/**
 * @param {import("@rspack/core").Configuration} config
 * @returns {Promise<void>}
 */
function runRspack(config) {
    return new Promise((resolve, reject) => {
        rspack(config, (err, stats) => {
            if (err || stats.hasErrors()) {
                console.error(stats?.toString("errors-only") || err);
                return reject(new Error("Build failed"));
            }
            resolve();
        });
    });
}

/**
 * PROVIDES (per <variant>)
 *
 * js.<variant>.dev.watch
 * js.<variant>.dev
 * js.<variant>.prod
 *
 */

// TODO: Move webpack config to build_variants.js and use a separate
// build variant for development
export default Object.fromEntries(
    Object.entries(BUILD_VARIANTS).map(([variant, data]) => {
        const dev = {
            build: () => runRspack(rspackConfig),
        };

        const prod = {
            build: () => runRspack(rspackProductionConfig),
        };

        return [variant, { dev, prod }];
    })
);
