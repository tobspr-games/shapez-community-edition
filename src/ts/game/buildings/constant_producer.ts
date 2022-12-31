/* typehints:start */
import type { Entity } from "../entity";
/* typehints:end */

import { enumDirection, Vector } from "../../core/vector";
import { ConstantSignalComponent } from "../components/constant_signal";
import { ItemEjectorComponent } from "../components/item_ejector";
import { ItemProducerComponent } from "../components/item_producer";
import { defaultBuildingVariant, MetaBuilding } from "../meta_building";

export class MetaConstantProducerBuilding extends MetaBuilding {
    constructor() {
        super("constant_producer");
    }

    static getAllVariantCombinations() {
        return [
            {
                internalId: 62,
                variant: defaultBuildingVariant,
            },
        ];
    }

    getSilhouetteColor() {
        return "#bfd630";
    }

    getIsRemovable(root: import("../../savegame/savegame_serializer").GameRoot) {
        return root.gameMode.getIsEditor();
    }

    /** Creates the entity at the given location */
    setupEntityComponents(entity: Entity) {
        entity.addComponent(
            new ItemEjectorComponent({
                slots: [{ pos: new Vector(0, 0), direction: enumDirection.top }],
            })
        );
        entity.addComponent(new ItemProducerComponent({}));
        entity.addComponent(new ConstantSignalComponent({}));
    }
}
