/**
 * @typedef {{ w: number, h: number }} Size
 * @typedef {{ x: number, y: number }} Position
 * @typedef {{
 *   frame: Position & Size,
 *   rotated: boolean,
 *   spriteSourceSize: Position & Size,
 *   sourceSize: Size,
 *   trimmed: boolean
 * }} SpriteDefinition
 *
 * @typedef {{
 *   app: string,
 *   version: string,
 *   image: string,
 *   format: string,
 *   size: Size,
 *   scale: string,
 *   smartupdate: string
 * }} AtlasMeta
 *
 * @typedef {{
 *   frames: Object.<string, SpriteDefinition>,
 *   meta: AtlasMeta
 * }} SourceData
 */

export class AtlasDefinition {
    /**
     * @param {SourceData} sourceData
     */
    constructor({ frames, meta }) {
        this.meta = meta;
        this.sourceData = frames;
        this.sourceFileName = meta.image;
    }

    getFullSourcePath() {
        return this.sourceFileName;
    }
}

/** @type {AtlasDefinition[]} **/
export const atlasFiles = (
    await Promise.all(
        import.meta
            // @ts-ignore
            .webpackContext("../../../res_built/atlas/", { recursive: false, regExp: /.*\.json/i })
            .keys()
            .map(f => f.replace(/^\.\//gi, ""))
            .map(f => import("../../../res_built/atlas/" + f))
    )
).map(data => new AtlasDefinition(data.default));
