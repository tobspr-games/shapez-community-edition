import type { BeltComponent } from "./components/belt";
import type { BeltUnderlaysComponent } from "./components/belt_underlays";
import type { HubComponent } from "./components/hub";
import type { ItemAcceptorComponent } from "./components/item_acceptor";
import type { ItemEjectorComponent } from "./components/item_ejector";
import type { ItemProcessorComponent } from "./components/item_processor";
import type { MinerComponent } from "./components/miner";
import type { StaticMapEntityComponent } from "./components/static_map_entity";
import type { StorageComponent } from "./components/storage";
import type { UndergroundBeltComponent } from "./components/underground_belt";
import type { WiredPinsComponent } from "./components/wired_pins";
import type { WireComponent } from "./components/wire";
import type { ConstantSignalComponent } from "./components/constant_signal";
import type { LogicGateComponent } from "./components/logic_gate";
import type { LeverComponent } from "./components/lever";
import type { WireTunnelComponent } from "./components/wire_tunnel";
import type { DisplayComponent } from "./components/display";
import type { BeltReaderComponent } from "./components/belt_reader";
import type { FilterComponent } from "./components/filter";
import type { ItemProducerComponent } from "./components/item_producer";
import type { GoalAcceptorComponent } from "./components/goal_acceptor";
import type { Component } from "./component";

/**
 * Typedefs for all entity components.
 */
export interface EntityComponentStorage {
    StaticMapEntity?: StaticMapEntityComponent;
    Belt?: BeltComponent;
    ItemEjector?: ItemEjectorComponent;
    ItemAcceptor?: ItemAcceptorComponent;
    Miner?: MinerComponent;
    ItemProcessor?: ItemProcessorComponent;
    UndergroundBelt?: UndergroundBeltComponent;
    Hub?: HubComponent;
    Storage?: StorageComponent;
    WiredPins?: WiredPinsComponent;
    BeltUnderlays?: BeltUnderlaysComponent;
    Wire?: WireComponent;
    ConstantSignal?: ConstantSignalComponent;
    LogicGate?: LogicGateComponent;
    Lever?: LeverComponent;
    WireTunnel?: WireTunnelComponent;
    Display?: DisplayComponent;
    BeltReader?: BeltReaderComponent;
    Filter?: FilterComponent;
    ItemProducer?: ItemProducerComponent;
    GoalAcceptor?: GoalAcceptorComponent;

    [k: string]: Component;
}
