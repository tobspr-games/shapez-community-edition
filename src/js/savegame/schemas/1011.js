import { createLogger } from "../../core/logging.js";
import { SavegameInterface_V1010 } from "./1010.js";

const schema = require("./1011.json");
const logger = createLogger("savegame_interface/1011");

export class SavegameInterface_V1011 extends SavegameInterface_V1010 {
    getVersion() {
        return 1011;
    }

    getSchemaUncached() {
        return schema;
    }

    /**
     * @param {import("../savegame_typedefs.js").SavegameData} data
     */
    static migrate1010to1011(data) {
        logger.log("Migrating 1010 to 1011");

        if (data.dump) {
            // TODO: Change after new chapters are added
            data.dump.hubGoals.chapter = "default";
            data.dump.hubGoals.completed = [];
        }
    }
}
