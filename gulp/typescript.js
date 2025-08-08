import * as path from "path";
import ts from "typescript";

/**
 * @param {ts.Diagnostic} diagnostic
 */
function printDiagnostic(diagnostic) {
    if (!diagnostic.file) {
        console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        return;
    }

    const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
}

/**
 * Reads the TypeScript compiler configuration from the specified path.
 * @param {string} configPath Path to the tsconfig.json file
 * @param {string} baseDir Directory used to resolve relative file paths
 * @param {string?} outDir Optional override for output directory
 */
function readConfig(configPath, baseDir, outDir) {
    // Please forgive me for this sin, copied from random parts of TS itself
    const cfgSource = ts.sys.readFile(configPath);
    const result = ts.parseJsonText(configPath, cfgSource);

    return ts.parseJsonSourceFileConfigFileContent(
        result,
        ts.sys,
        baseDir,
        outDir ? { outDir } : undefined,
        configPath
    );
}

/**
 * Builds a TypeScript project.
 * Mostly based on https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
 * @param {string} configPath Path to the tsconfig.json file
 * @param {string?} baseDir Directory used to resolve relative file paths
 * @param {string?} outDir Optional override for output directory
 */
export function buildProject(configPath, baseDir = undefined, outDir = undefined) {
    configPath = path.resolve(configPath);

    if (baseDir === undefined) {
        baseDir = path.dirname(configPath);
    }
    baseDir = path.resolve(baseDir);

    const config = readConfig(configPath, baseDir, outDir);
    const program = ts.createProgram(config.fileNames, config.options);
    const result = program.emit();

    const diagnostics = ts.getPreEmitDiagnostics(program).concat(result.diagnostics);
    for (const diagnostic of diagnostics) {
        printDiagnostic(diagnostic);
    }

    const success = !result.emitSkipped;
    if (!success) {
        throw new Error("TypeScript compilation failed! Relevant errors may have been displayed above.");
    }
}
