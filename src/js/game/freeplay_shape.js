import { RandomNumberGenerator } from "../core/rng";
import { enumColors } from "./colors";
import { enumSubShape, ShapeDefinition } from "./shape_definition";

/**
 * @typedef {{colorsAllowed?: enumColors[], shapesAllowed?: enumSubShape[], layerCount?: number, randomWindmill?: boolean, shapesMissingAllowed?: boolean}} FreeplayOptions
 */

export class FreeplayShape {
    /**
     * Creates a (seeded) random shape
     * @param {string} chapterId
     * @param {string} levelId
     * @param {number} seed
     * @param {FreeplayOptions} options
     * @returns {string}
     */
    static computeFreeplayShape(
        chapterId,
        levelId,
        seed,
        {
            colorsAllowed = [
                enumColors.red,
                enumColors.yellow,
                enumColors.green,
                enumColors.cyan,
                enumColors.blue,
                enumColors.purple,
                enumColors.red,
                enumColors.yellow,
                enumColors.white,
            ],
            shapesAllowed = [enumSubShape.rect, enumSubShape.circle, enumSubShape.star],
            layerCount = 2,
            randomWindmill = true,
            shapesMissingAllowed = true,
        }
    ) {
        /** @type {Array<import("./shape_definition").ShapeLayer>} */
        let layers = [];

        const rng = new RandomNumberGenerator(seed + "/" + chapterId + "/" + levelId);

        const colors = FreeplayShape.generateRandomColorSet(rng, colorsAllowed);

        let pickedSymmetry = null; // pairs of quadrants that must be the same
        if (rng.next() < 0.5) {
            pickedSymmetry = [
                // radial symmetry
                [0, 2],
                [1, 3],
            ];
            if (randomWindmill) shapesAllowed.push(enumSubShape.windmill); // windmill looks good only in radial symmetry
        } else {
            const symmetries = [
                [
                    // horizontal axis
                    [0, 3],
                    [1, 2],
                ],
                [
                    // vertical axis
                    [0, 1],
                    [2, 3],
                ],
                [
                    // diagonal axis
                    [0, 2],
                    [1],
                    [3],
                ],
                [
                    // other diagonal axis
                    [1, 3],
                    [0],
                    [2],
                ],
            ];
            pickedSymmetry = rng.choice(symmetries);
        }

        const randomColor = () => rng.choice(colors);
        const randomShape = () => rng.choice(shapesAllowed);

        let anyIsMissingTwo = false;

        for (let i = 0; i < layerCount; ++i) {
            /** @type {import("./shape_definition").ShapeLayer} */
            const layer = [null, null, null, null];

            for (let j = 0; j < pickedSymmetry.length; ++j) {
                const group = pickedSymmetry[j];
                const shape = randomShape();
                const color = randomColor();
                for (let k = 0; k < group.length; ++k) {
                    const quad = group[k];
                    layer[quad] = {
                        subShape: shape,
                        color,
                    };
                }
            }

            // Sometimes they actually are missing *two* ones!
            // Make sure at max only one layer is missing it though, otherwise we could
            // create an uncreateable shape
            if (shapesMissingAllowed && rng.next() > 0.95 && !anyIsMissingTwo) {
                layer[rng.nextIntRange(0, 4)] = null;
                anyIsMissingTwo = true;
            }

            layers.push(layer);
        }

        const definition = new ShapeDefinition({ layers });
        return definition.getHash();
    }

    /**
     * Picks random colors which are close to each other
     * @param {RandomNumberGenerator} rng
     * @param {enumColors[]} colorWheel
     */
    static generateRandomColorSet(rng, colorWheel) {
        const index = rng.nextIntRange(0, colorWheel.length - 2);
        const pickedColors = colorWheel.slice(index, index + 3);
        return pickedColors;
    }
}
