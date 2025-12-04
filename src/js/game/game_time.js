/* typehints:start */
import { GameRoot } from "./root";
/* typehints:end */

import { globalConfig } from "../core/config";
import { BasicSerializableObject, types } from "../savegame/serialization";

const MAX_LOGIC_STEPS_IN_QUEUE = 3;

export class GameTime extends BasicSerializableObject {
    /**
     * @param {GameRoot} root
     */
    constructor(root) {
        super();
        this.root = root;

        // Current ingame time seconds, not incremented while paused
        this.timeSeconds = 0;

        // Current "realtime", a timer which always is incremented no matter whether the game is paused or no
        this.realtimeSeconds = 0;

        // The adjustment, used when loading savegames so we can continue where we were
        this.realtimeAdjust = 0;

        // Store how much time we have in bucket
        this.logicTimeBudget = 0;
    }

    static getId() {
        return "GameTime";
    }

    static getSchema() {
        return {
            timeSeconds: types.float,
            realtimeSeconds: types.float,
        };
    }

    /**
     * Fetches the new "real" time, called from the core once per frame, since performance now() is kinda slow
     */
    updateRealtimeNow() {
        this.realtimeSeconds = performance.now() / 1000.0 + this.realtimeAdjust;
    }

    /**
     * Returns the ingame time in milliseconds
     */
    getTimeMs() {
        return this.timeSeconds * 1000.0;
    }

    /**
     * Internal method to generate new logic time budget
     * @param {number} deltaMs
     */
    internalAddDeltaToBudget(deltaMs) {
        // Only update if game is supposed to update
        if (this.root.hud.shouldPauseGame()) {
            this.logicTimeBudget = 0;
        } else {
            this.logicTimeBudget += deltaMs;
        }

        // Check for too big pile of updates -> reduce it to 1
        // TODO: Does this "3" have the same meaning as MAX_LOGIC_STEPS_IN_QUEUE?
        let maxLogicSteps = Math.max(
            3,
            (MAX_LOGIC_STEPS_IN_QUEUE * this.root.dynamicTickrate.currentTickRate) / 60
        );
        if (G_IS_DEV && globalConfig.debug.framePausesBetweenTicks) {
            maxLogicSteps *= 1 + globalConfig.debug.framePausesBetweenTicks;
        }

        if (this.logicTimeBudget > this.root.dynamicTickrate.deltaMs * maxLogicSteps) {
            this.logicTimeBudget = this.root.dynamicTickrate.deltaMs * maxLogicSteps;
        }
    }

    /**
     * Performs update ticks based on the queued logic budget
     * @param {number} deltaMs
     * @param {function():boolean} updateMethod
     */
    performTicks(deltaMs, updateMethod) {
        this.internalAddDeltaToBudget(deltaMs);

        let effectiveDelta = this.root.dynamicTickrate.deltaMs;
        if (G_IS_DEV && globalConfig.debug.framePausesBetweenTicks) {
            effectiveDelta += globalConfig.debug.framePausesBetweenTicks * this.root.dynamicTickrate.deltaMs;
        }

        // Update physics & logic
        while (this.logicTimeBudget >= effectiveDelta) {
            this.logicTimeBudget -= effectiveDelta;

            if (!updateMethod()) {
                // Gameover happened or so, do not update anymore
                return;
            }

            // Step game time
            this.timeSeconds += this.root.dynamicTickrate.deltaSeconds;
        }
    }

    /**
     * Returns ingame time in seconds
     * @returns {number} seconds
     */
    now() {
        return this.timeSeconds;
    }

    /**
     * Returns "real" time in seconds
     * @returns {number} seconds
     */
    realtimeNow() {
        return this.realtimeSeconds;
    }

    /**
     * Returns "real" time in seconds
     * @returns {number} seconds
     */
    systemNow() {
        return (this.realtimeSeconds - this.realtimeAdjust) * 1000.0;
    }

    deserialize(data) {
        const errorCode = super.deserialize(data);
        if (errorCode) {
            return errorCode;
        }

        // Adjust realtime now difference so they match
        this.realtimeAdjust = this.realtimeSeconds - performance.now() / 1000.0;
        this.updateRealtimeNow();
    }
}
