/* typehints:start */
import { Entity } from "../entity";
/* typehints:end */

import { BUILDING_IDS } from "../building_identifiers";
import { defaultBuildingVariant, MetaBuilding } from "../meta_building";

export class MetaBlockBuilding extends MetaBuilding {
    constructor() {
        super(BUILDING_IDS.block);
    }

    static getAllVariantCombinations() {
        return [
            {
                internalId: 64,
                variant: defaultBuildingVariant,
            },
        ];
    }

    getSilhouetteColor() {
        return "#333";
    }

    /**
     *
     * @param {import("../../savegame/savegame_serializer").GameRoot} root
     * @returns
     */
    getIsRemovable(root) {
        return root.gameMode.getIsEditor();
    }

    /**
     * Creates the entity at the given location
     * @param {Entity} entity
     */
    setupEntityComponents(entity) {}
}
