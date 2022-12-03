import fs from "fs";

const configTemplatePath = "../src/js/core/config.local.template.js";
const configPath = "../src/js/core/config.local.js";

export default function gulptasksLocalConfig(gulp) {
    gulp.task("localConfig.findOrCreate", cb => {
        if (!fs.existsSync(configPath)) {
            fs.copyFileSync(configTemplatePath, configPath);
        }

        cb();
    });
}
