/* typehints:start */
import { Application } from "../application";
import { InputReceiver } from "../core/input_receiver";
import { GameRoot } from "./root";
/* typehints:end */

import { getStringForKeyCode, KEYCODES, keyToKeyCode } from "@/core/keycodes";
import { IS_MOBILE } from "../core/config";
import { Signal, STOP_PROPAGATION } from "../core/signal";
import { T } from "../translations";

export const KEYMAPPINGS = {
    // Make sure mods come first so they can override everything
    mods: {},

    general: {
        confirm: { keyCode: KEYCODES.Enter },
        back: { keyCode: KEYCODES.Escape, builtin: true },
    },

    ingame: {
        menuOpenShop: { keyCode: keyToKeyCode("F") },
        menuOpenStats: { keyCode: keyToKeyCode("G") },
        menuClose: { keyCode: keyToKeyCode("Q") },

        toggleHud: { keyCode: KEYCODES.F2 },
        exportScreenshot: { keyCode: KEYCODES.F3 },
        toggleFPSInfo: { keyCode: KEYCODES.F4 },

        switchLayers: { keyCode: keyToKeyCode("E") },

        showShapeTooltip: { keyCode: KEYCODES.Alt },
    },

    navigation: {
        mapMoveUp: { keyCode: keyToKeyCode("W") },
        mapMoveRight: { keyCode: keyToKeyCode("D") },
        mapMoveDown: { keyCode: keyToKeyCode("S") },
        mapMoveLeft: { keyCode: keyToKeyCode("A") },
        mapMoveFaster: { keyCode: KEYCODES.Shift },

        centerMap: { keyCode: KEYCODES.Space },
        mapZoomIn: { keyCode: KEYCODES.Plus, repeated: true },
        mapZoomOut: { keyCode: KEYCODES.Minus, repeated: true },
        createMarker: { keyCode: keyToKeyCode("M") },
    },

    buildings: {
        // Puzzle buildings
        constant_producer: { keyCode: keyToKeyCode("H") },
        goal_acceptor: { keyCode: keyToKeyCode("N") },
        block: { keyCode: keyToKeyCode("4") },

        // Primary Toolbar
        belt: { keyCode: keyToKeyCode("1") },
        balancer: { keyCode: keyToKeyCode("2") },
        underground_belt: { keyCode: keyToKeyCode("3") },
        miner: { keyCode: keyToKeyCode("4") },
        cutter: { keyCode: keyToKeyCode("5") },
        rotator: { keyCode: keyToKeyCode("6") },
        stacker: { keyCode: keyToKeyCode("7") },
        mixer: { keyCode: keyToKeyCode("8") },
        painter: { keyCode: keyToKeyCode("9") },
        trash: { keyCode: keyToKeyCode("0") },

        // Sandbox
        item_producer: { keyCode: keyToKeyCode("L") },

        // Secondary toolbar
        storage: { keyCode: keyToKeyCode("Y") },
        reader: { keyCode: keyToKeyCode("U") },
        lever: { keyCode: keyToKeyCode("I") },
        filter: { keyCode: keyToKeyCode("O") },
        display: { keyCode: keyToKeyCode("P") },

        // Wires toolbar
        wire: { keyCode: keyToKeyCode("1") },
        wire_tunnel: { keyCode: keyToKeyCode("2") },
        constant_signal: { keyCode: keyToKeyCode("3") },
        logic_gate: { keyCode: keyToKeyCode("4") },
        virtual_processor: { keyCode: keyToKeyCode("5") },
        analyzer: { keyCode: keyToKeyCode("6") },
        comparator: { keyCode: keyToKeyCode("7") },
        transistor: { keyCode: keyToKeyCode("8") },
    },

    placement: {
        pipette: { keyCode: keyToKeyCode("Q") },
        rotateWhilePlacing: { keyCode: keyToKeyCode("R") },
        rotateInverseModifier: { keyCode: KEYCODES.Shift },
        rotateToUp: { keyCode: KEYCODES.ArrowUp },
        rotateToDown: { keyCode: KEYCODES.ArrowDown },
        rotateToRight: { keyCode: KEYCODES.ArrowRight },
        rotateToLeft: { keyCode: KEYCODES.ArrowLeft },
        cycleBuildingVariants: { keyCode: keyToKeyCode("T") },
        cycleBuildings: { keyCode: KEYCODES.Tab },
        switchDirectionLockSide: { keyCode: keyToKeyCode("R") },

        copyWireValue: { keyCode: keyToKeyCode("Z") },
    },

    massSelect: {
        massSelectStart: { keyCode: KEYCODES.Ctrl },
        massSelectSelectMultiple: { keyCode: KEYCODES.Shift },
        massSelectCopy: { keyCode: keyToKeyCode("C") },
        massSelectCut: { keyCode: keyToKeyCode("X") },
        massSelectClear: { keyCode: keyToKeyCode("B") },
        confirmMassDelete: { keyCode: KEYCODES.Delete },
        pasteLastBlueprint: { keyCode: keyToKeyCode("V") },
    },

    placementModifiers: {
        lockBeltDirection: { keyCode: KEYCODES.Shift },
        placementDisableAutoOrientation: { keyCode: KEYCODES.Ctrl },
        placeMultiple: { keyCode: KEYCODES.Shift },
        placeInverse: { keyCode: KEYCODES.Alt },
    },
};

// Assign ids
for (const categoryId in KEYMAPPINGS) {
    for (const mappingId in KEYMAPPINGS[categoryId]) {
        KEYMAPPINGS[categoryId][mappingId].id = mappingId;
    }
}

export class Keybinding {
    /**
     *
     * @param {KeyActionMapper} keyMapper
     * @param {Application} app
     * @param {object} param0
     * @param {number} param0.keyCode
     * @param {boolean=} param0.builtin
     * @param {boolean=} param0.repeated
     * @param {{ shift?: boolean; alt?: boolean; ctrl?: boolean; }=} param0.modifiers
     */
    constructor(keyMapper, app, { keyCode, builtin = false, repeated = false, modifiers = {} }) {
        assert(keyCode && Number.isInteger(keyCode), "Invalid key code: " + keyCode);
        this.keyMapper = keyMapper;
        this.app = app;
        this.keyCode = keyCode;
        this.builtin = builtin;
        this.repeated = repeated;

        this.modifiers = modifiers;

        this.signal = new Signal();
        this.toggled = new Signal();
    }

    /**
     * Returns whether this binding is currently pressed
     * @returns {boolean}
     */
    get pressed() {
        // Check if the key is down
        if (this.app.inputMgr.keysDown.has(this.keyCode)) {
            // Check if it is the top receiver
            const receiver = this.keyMapper.inputReceiver;
            return this.app.inputMgr.getTopReceiver() === receiver;
        }
        return false;
    }

    /**
     * Adds an event listener
     * @param {function() : void} receiver
     * @param {object=} scope
     */
    add(receiver, scope = null) {
        this.signal.add(receiver, scope);
    }

    /**
     * Adds an event listener
     * @param {function() : void} receiver
     * @param {object=} scope
     */
    addToTop(receiver, scope = null) {
        this.signal.addToTop(receiver, scope);
    }

    /**
     * @param {Element} elem
     * @returns {HTMLElement} the created element, or null if the keybindings are not shown
     *  */
    appendLabelToElement(elem) {
        if (IS_MOBILE) {
            return null;
        }
        const spacer = document.createElement("kbd");
        spacer.innerHTML = getStringForKeyCode(this.keyCode);
        elem.appendChild(spacer);
        return spacer;
    }

    /**
     * Returns the key code as a nice string
     */
    getKeyCodeString() {
        return getStringForKeyCode(this.keyCode);
    }

    /**
     * Remvoes all signal receivers
     */
    clearSignalReceivers() {
        this.signal.removeAll();
    }
}

export class KeyActionMapper {
    /**
     *
     * @param {GameRoot} root
     * @param {InputReceiver} inputReceiver
     */
    constructor(root, inputReceiver) {
        this.root = root;
        this.inputReceiver = inputReceiver;

        inputReceiver.keydown.add(this.handleKeydown, this);
        inputReceiver.keyup.add(this.handleKeyup, this);

        /** @type {Object.<string, Keybinding>} */
        this.keybindings = {};

        const overrides = root.app.settings.getKeybindingOverrides();

        for (const category in KEYMAPPINGS) {
            for (const key in KEYMAPPINGS[category]) {
                let payload = Object.assign({}, KEYMAPPINGS[category][key]);
                if (overrides[key]) {
                    payload.keyCode = overrides[key];
                }
                this.keybindings[key] = new Keybinding(this, this.root.app, payload);

                if (G_IS_DEV) {
                    // Sanity
                    if (!T.keybindings.mappings[key]) {
                        assertAlways(false, "Keybinding " + key + " has no translation!");
                    }
                }
            }
        }

        inputReceiver.pageBlur.add(this.onPageBlur, this);
        inputReceiver.destroyed.add(this.cleanup, this);
    }

    /**
     * Returns all keybindings starting with the given id
     * @param {string} pattern
     * @returns {Array<Keybinding>}
     */
    getKeybindingsStartingWith(pattern) {
        let result = [];
        for (const key in this.keybindings) {
            if (key.startsWith(pattern)) {
                result.push(this.keybindings[key]);
            }
        }
        return result;
    }

    /**
     * Forwards the given events to the other mapper (used in tooltips)
     * @param {KeyActionMapper} receiver
     * @param {Array<string>} bindings
     */
    forward(receiver, bindings) {
        for (let i = 0; i < bindings.length; ++i) {
            const key = bindings[i];
            this.keybindings[key].signal.add((...args) => receiver.keybindings[key].signal.dispatch(...args));
        }
    }

    cleanup() {
        for (const key in this.keybindings) {
            this.keybindings[key].signal.removeAll();
        }
    }

    onPageBlur() {
        // Reset all down states
        // Find mapping
        for (const key in this.keybindings) {
            /** @type {Keybinding} */
            const binding = this.keybindings[key];
        }
    }

    /**
     * Internal keydown handler
     * @param {object} param0
     * @param {number} param0.keyCode
     * @param {boolean} param0.shift
     * @param {boolean} param0.alt
     * @param {boolean} param0.ctrl
     * @param {boolean=} param0.initial
     */
    handleKeydown({ keyCode, shift, alt, ctrl, initial }) {
        let stop = false;

        // Find mapping
        for (const key in this.keybindings) {
            /** @type {Keybinding} */
            const binding = this.keybindings[key];
            if (binding.keyCode === keyCode && (initial || binding.repeated)) {
                if (binding.modifiers.shift && !shift) {
                    continue;
                }

                if (binding.modifiers.ctrl && !ctrl) {
                    continue;
                }

                if (binding.modifiers.alt && !alt) {
                    continue;
                }

                /** @type {Signal} */
                const signal = this.keybindings[key].signal;
                if (signal.dispatch() === STOP_PROPAGATION) {
                    return;
                }
            }
        }

        if (stop) {
            return STOP_PROPAGATION;
        }
    }

    /**
     * Internal keyup handler
     * @param {object} param0
     * @param {number} param0.keyCode
     * @param {boolean} param0.shift
     * @param {boolean} param0.alt
     */
    handleKeyup({ keyCode, shift, alt }) {
        // Empty
    }

    /**
     * Returns a given keybinding
     * @param {{ keyCode: number }} binding
     * @returns {Keybinding}
     */
    getBinding(binding) {
        // @ts-ignore
        const id = binding.id;
        assert(id, "Not a valid keybinding: " + JSON.stringify(binding));
        assert(this.keybindings[id], "Keybinding " + id + " not known!");
        return this.keybindings[id];
    }

    /**
     * Returns a given keybinding
     * @param {string} id
     * @returns {Keybinding}
     */
    getBindingById(id) {
        assert(this.keybindings[id], "Keybinding " + id + " not known!");
        return this.keybindings[id];
    }
}
