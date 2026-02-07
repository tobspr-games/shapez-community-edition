import { exec } from "node:child_process";
import fs from "node:fs/promises";
import gulp from "gulp";
import { promisify } from "node:util";

const texturePackerUrl =
    "https://libgdx-nightlies.s3.amazonaws.com/libgdx-runnables/runnable-texturepacker.jar";

const configTemplatePath = "../src/js/core/config.local.template.js";
const configPath = "../src/js/core/config.local.js";

export async function checkJava() {
    try {
        const { stderr } = await promisify(exec)("java -version");
        console.log(`Found Java:`, stderr);
    } catch {
        throw new Error("Java is required to build the texture atlas, but was not found");
    }
}

export async function downloadTexturePacker() {
    const destination = "./runnable-texturepacker.jar";

    try {
        // If the file exists already, we're done
        await fs.access(destination);
        return;
    } catch {
        // File does not exist, need to download
    }

    console.log(`Downloading ${destination}...`);
    const response = await fetch(texturePackerUrl);
    if (!response.ok) {
        throw new Error(`Failed to download Texture Packer: ${response.statusText}`);
    }

    await fs.writeFile(destination, response.body);
}

export async function createLocalConfig() {
    try {
        await fs.copyFile(configTemplatePath, configPath, fs.constants.COPYFILE_EXCL);
    } catch {
        // The file is already there
    }
}

export const prepare = gulp.parallel(gulp.series(checkJava, downloadTexturePacker), createLocalConfig);
