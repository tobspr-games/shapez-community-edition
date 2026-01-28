import { Logger } from "../../core/logging";
import { SavegameInterface_V1007 } from "./1007.js";

import schema from "./1008.json";
const logger = new Logger("savegame_interface/1008");

export class SavegameInterface_V1008 extends SavegameInterface_V1007 {
    getVersion() {
        return 1008;
    }

    getSchemaUncached() {
        return schema;
    }

    /**
     * @param {import("../savegame_typedefs.js").SavegameData} data
     */
    static migrate1007to1008(data) {
        // Note: no-op since achievement removal
        logger.log("Migrating 1007 to 1008");
    }
}
