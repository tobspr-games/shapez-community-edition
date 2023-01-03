import { createLogger } from "../../core/logging";
import { SavegameInterface_V1006 } from "./1006";


import schema from "./1007.json";
const logger = createLogger("savegame_interface/1007");

export class SavegameInterface_V1007 extends SavegameInterface_V1006 {
    getVersion() {
        return 1007;
    }

    getSchemaUncached() {
        return schema;
    }

    static migrate1006to1007(data: import("../savegame_typedefs.js").SavegameData) {
        logger.log("Migrating 1006 to 1007");
        const dump = data.dump;
        if (!dump) {
            return true;
        }

        const waypoints = dump.waypoints.waypoints;

        // set waypoint layer to "regular"
        for (let i = 0; i < waypoints.length; ++i) {
            const waypoint = waypoints[i];
            waypoint.layer = "regular";
        }
    }
}
