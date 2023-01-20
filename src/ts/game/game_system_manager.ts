import type { GameSystem } from "./game_system";
import type { GameRoot } from "./root";

import { createLogger } from "../core/logging";
import { BeltSystem } from "./systems/belt";
import { ItemEjectorSystem } from "./systems/item_ejector";
import { MapResourcesSystem } from "./systems/map_resources";
import { MinerSystem } from "./systems/miner";
import { ItemProcessorSystem } from "./systems/item_processor";
import { UndergroundBeltSystem } from "./systems/underground_belt";
import { HubSystem } from "./systems/hub";
import { StaticMapEntitySystem } from "./systems/static_map_entity";
import { ItemAcceptorSystem } from "./systems/item_acceptor";
import { StorageSystem } from "./systems/storage";
import { WiredPinsSystem } from "./systems/wired_pins";
import { BeltUnderlaysSystem } from "./systems/belt_underlays";
import { WireSystem } from "./systems/wire";
import { ConstantSignalSystem } from "./systems/constant_signal";
import { LogicGateSystem } from "./systems/logic_gate";
import { LeverSystem } from "./systems/lever";
import { DisplaySystem } from "./systems/display";
import { ItemProcessorOverlaysSystem } from "./systems/item_processor_overlays";
import { BeltReaderSystem } from "./systems/belt_reader";
import { FilterSystem } from "./systems/filter";
import { ItemProducerSystem } from "./systems/item_producer";
import { ConstantProducerSystem } from "./systems/constant_producer";
import { GoalAcceptorSystem } from "./systems/goal_acceptor";
import { ZoneSystem } from "./systems/zone";

const logger = createLogger("game_system_manager");

export const MODS_ADDITIONAL_SYSTEMS: {
    [idx: string]: Array<{
        id: string;
        systemClass: new (any) => GameSystem;
    }>;
} = {};

export class GameSystemManager {
    public systems: {
        belt: BeltSystem;

        itemEjector: ItemEjectorSystem;

        mapResources: MapResourcesSystem;

        miner: MinerSystem;

        itemProcessor: ItemProcessorSystem;

        undergroundBelt: UndergroundBeltSystem;

        hub: HubSystem;

        staticMapEntities: StaticMapEntitySystem;

        itemAcceptor: ItemAcceptorSystem;

        storage: StorageSystem;

        wiredPins: WiredPinsSystem;

        beltUnderlays: BeltUnderlaysSystem;

        wire: WireSystem;

        constantSignal: ConstantSignalSystem;

        logicGate: LogicGateSystem;

        lever: LeverSystem;

        display: DisplaySystem;

        itemProcessorOverlays: ItemProcessorOverlaysSystem;

        beltReader: BeltReaderSystem;

        filter: FilterSystem;

        itemProducer: ItemProducerSystem;

        constantProducer: ConstantProducerSystem;

        goalAcceptor: GoalAcceptorSystem;

        zone: ZoneSystem;
    } = {} as any;
    public systemUpdateOrder = [];

    constructor(public root: GameRoot) {
        this.internalInitSystems();
    }

    /** Initializes all systems */
    internalInitSystems() {
        const addBefore = id => {
            const systems = MODS_ADDITIONAL_SYSTEMS[id];
            if (systems) {
                systems.forEach(({ id, systemClass }) => add(id, systemClass));
            }
        };

        const add = (id, systemClass) => {
            addBefore(id);
            this.systems[id] = new systemClass(this.root);
            this.systemUpdateOrder.push(id);
        };

        // Order is important!

        // IMPORTANT: Item acceptor must be before the belt, because it may not tick after the belt
        // has put in the item into the acceptor animation, otherwise its off
        add("itemAcceptor", ItemAcceptorSystem);

        add("belt", BeltSystem);

        add("undergroundBelt", UndergroundBeltSystem);

        add("miner", MinerSystem);

        add("storage", StorageSystem);

        add("itemProcessor", ItemProcessorSystem);

        add("filter", FilterSystem);

        add("itemProducer", ItemProducerSystem);

        add("itemEjector", ItemEjectorSystem);

        if (this.root.gameMode.hasResources()) {
            add("mapResources", MapResourcesSystem);
        }

        add("hub", HubSystem);

        add("staticMapEntities", StaticMapEntitySystem);

        add("wiredPins", WiredPinsSystem);

        add("beltUnderlays", BeltUnderlaysSystem);

        add("constantSignal", ConstantSignalSystem);

        // WIRES section
        add("lever", LeverSystem);

        // Wires must be before all gate, signal etc logic!
        add("wire", WireSystem);

        // IMPORTANT: We have 2 phases: In phase 1 we compute the output values of all gates,
        // processors etc. In phase 2 we propagate it through the wires network
        add("logicGate", LogicGateSystem);

        add("beltReader", BeltReaderSystem);

        add("display", DisplaySystem);

        add("itemProcessorOverlays", ItemProcessorOverlaysSystem);

        add("constantProducer", ConstantProducerSystem);

        add("goalAcceptor", GoalAcceptorSystem);

        if (this.root.gameMode.getBuildableZones()) {
            add("zone", ZoneSystem);
        }

        addBefore("end");

        for (const key in MODS_ADDITIONAL_SYSTEMS) {
            if (!this.systems[key] && key !== "end") {
                logger.error("Mod system not attached due to invalid 'before': ", key);
            }
        }

        logger.log("📦 There are", this.systemUpdateOrder.length, "game systems");
    }

    /** Updates all systems */
    update() {
        for (let i = 0; i < this.systemUpdateOrder.length; ++i) {
            const system = this.systems[this.systemUpdateOrder[i]];
            system.update();
        }
    }

    refreshCaches() {
        for (let i = 0; i < this.systemUpdateOrder.length; ++i) {
            const system = this.systems[this.systemUpdateOrder[i]];
            system.refreshCaches();
        }
    }
}
