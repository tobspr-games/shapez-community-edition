import { types } from "../../savegame/serialization";
import { BaseItem } from "../base_item";
import { Component } from "../component";
import { Entity } from "../entity";

/**
 * @typedef {{
 * item: BaseItem,
 * extraProgress?: number,
 * }} MinerItem
 */

export class MinerComponent extends Component {
    static getId() {
        return "Miner";
    }

    static getSchema() {
        // cachedMinedItem is not serialized.
        return {
            progress: types.ufloat,
        };
    }

    constructor({ chainable = false }) {
        super();
        this.progress = 0;
        this.chainable = chainable;

        /**
         * The item we are mining beneath us.
         * Null means there is no item beneath us.
         * @type {BaseItem|null}
         */
        this.cachedMinedItem = null;

        /**
         * For chainable miners, which miner this miner connects to.
         * Null means there is no entity (end of a chain); undefined additionally means this miner should not try ejecting.
         * @type {Entity|null|undefined}
         */
        this.cachedChainedMiner = undefined;
        /**
         * For chainable miners, the miner at the end of the chain, which actually ejects the items. This could be itself.
         * Null means there is no entity (because of a loop or because the miner is not over a resource); undefined means uncomputed.
         * @type {Entity|null|undefined}
         */
        this.cachedExitMiner = undefined;
    }
}
