import { createLogger } from "../../core/logging";
import { SavegameInterface_V1009 } from "./1009";

import schema from "./1010.json";
const logger = createLogger("savegame_interface/1010");

export class SavegameInterface_V1010 extends SavegameInterface_V1009 {
    getVersion() {
        return 1010;
    }

    getSchemaUncached() {
        return schema;
    }

    static migrate1009to1010(data: import("../savegame_typedefs.js").SavegameData) {
        logger.log("Migrating 1009 to 1010");

        data.mods = [];

        if (data.dump) {
            data.dump.modExtraData = {};
        }
    }
}
