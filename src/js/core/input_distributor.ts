import type { Application } from "../application";
import type { InputReceiver, ReceiverId } from "./input_receiver";

import { createLogger } from "./logging";
import { Signal, STOP_PROPAGATION } from "./signal";
import { arrayDeleteValue, fastArrayDeleteValue } from "./utils";

const logger = createLogger("input_distributor");

export class InputDistributor {
    public receiverStack: InputReceiver[] = [];
    public filters: ((arg: string) => boolean)[] = [];

    /**
     * All keys which are currently down
     */
    public keysDown = new Set<number>();

    constructor(public app: Application) {
        this.bindToEvents();
    }

    /**
     * Attaches a new filter which can filter and reject events
     */
    installFilter(filter: (arg: string) => boolean) {
        this.filters.push(filter);
    }

    /**
     * Removes an attached filter
     */
    dismountFilter(filter: (arg: string) => boolean) {
        fastArrayDeleteValue(this.filters, filter);
    }

    pushReceiver(receiver: InputReceiver) {
        if (this.isReceiverAttached(receiver)) {
            assert(false, "Can not add receiver " + receiver.context + " twice");
            logger.error("Can not add receiver", receiver.context, "twice");
            return;
        }
        this.receiverStack.push(receiver);

        if (this.receiverStack.length > 10) {
            logger.error(
                "Receiver stack is huge, probably some dead receivers arround:",
                this.receiverStack.map(x => x.context)
            );
        }
    }

    popReceiver(receiver: InputReceiver) {
        if (this.receiverStack.indexOf(receiver) < 0) {
            assert(false, "Can not pop receiver " + receiver.context + "  since its not contained");
            logger.error("Can not pop receiver", receiver.context, "since its not contained");
            return;
        }
        if (this.receiverStack[this.receiverStack.length - 1] !== receiver) {
            logger.warn(
                "Popping receiver",
                receiver.context,
                "which is not on top of the stack. Stack is: ",
                this.receiverStack.map(x => x.context)
            );
        }
        arrayDeleteValue(this.receiverStack, receiver);
    }

    isReceiverAttached(receiver: InputReceiver) {
        return this.receiverStack.indexOf(receiver) >= 0;
    }

    isReceiverOnTop(receiver: InputReceiver) {
        return (
            this.isReceiverAttached(receiver) &&
            this.receiverStack[this.receiverStack.length - 1] === receiver
        );
    }

    makeSureAttachedAndOnTop(receiver: InputReceiver) {
        this.makeSureDetached(receiver);
        this.pushReceiver(receiver);
    }

    makeSureDetached(receiver: InputReceiver) {
        if (this.isReceiverAttached(receiver)) {
            arrayDeleteValue(this.receiverStack, receiver);
        }
    }

    destroyReceiver(receiver: InputReceiver) {
        this.makeSureDetached(receiver);
        receiver.cleanup();
    }

    // Internal

    getTopReceiver() {
        if (this.receiverStack.length > 0) {
            return this.receiverStack[this.receiverStack.length - 1];
        }
        return null;
    }

    bindToEvents() {
        window.addEventListener("popstate", this.handleBackButton.bind(this), false);
        document.addEventListener("backbutton", this.handleBackButton.bind(this), false);

        window.addEventListener("keydown", this.handleKeyMouseDown.bind(this));
        window.addEventListener("keyup", this.handleKeyMouseUp.bind(this));

        window.addEventListener("mousedown", this.handleKeyMouseDown.bind(this));
        window.addEventListener("mouseup", this.handleKeyMouseUp.bind(this));

        window.addEventListener("blur", this.handleBlur.bind(this));

        document.addEventListener("paste", this.handlePaste.bind(this));
    }

    forwardToReceiver<T extends ReceiverId>(
        eventId: T,
        payload: Parameters<InputReceiver[T]["dispatch"]>[0] = null
    ) {
        // Check filters
        for (let i = 0; i < this.filters.length; ++i) {
            if (!this.filters[i](eventId)) {
                return STOP_PROPAGATION;
            }
        }

        const receiver = this.getTopReceiver();
        if (!receiver) {
            logger.warn("Dismissing event because not receiver was found:", eventId);
            return;
        }
        const signal = receiver[eventId];
        assert(signal instanceof Signal, "Not a valid event id");
        // probably not possible to type properly, since the types of `signal` and `payload` are correlated
        return signal.dispatch(payload as never);
    }

    handleBackButton(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.forwardToReceiver("backButton");
    }

    /**
     * Handles when the page got blurred
     */
    handleBlur() {
        this.forwardToReceiver("pageBlur");
        this.keysDown.clear();
    }

    handlePaste(ev: ClipboardEvent) {
        this.forwardToReceiver("paste", ev);
    }

    handleKeyMouseDown(event: KeyboardEvent | MouseEvent) {
        const keyCode = event instanceof MouseEvent ? event.button + 1 : event.keyCode;
        if (
            keyCode === 4 || // MB4
            keyCode === 5 || // MB5
            keyCode === 9 || // TAB
            keyCode === 16 || // SHIFT
            keyCode === 17 || // CTRL
            keyCode === 18 || // ALT
            (keyCode >= 112 && keyCode < 122) // F1 - F10
        ) {
            event.preventDefault();
        }

        const isInitial = !this.keysDown.has(keyCode);
        this.keysDown.add(keyCode);

        if (
            this.forwardToReceiver("keydown", {
                keyCode: keyCode,
                shift: event.shiftKey,
                alt: event.altKey,
                ctrl: event.ctrlKey,
                initial: isInitial,
                event,
            }) === STOP_PROPAGATION
        ) {
            return;
        }

        if (keyCode === 27) {
            // Escape key
            event.preventDefault();
            event.stopPropagation();
            return this.forwardToReceiver("backButton");
        }
    }

    handleKeyMouseUp(event: KeyboardEvent | MouseEvent) {
        const keyCode = event instanceof MouseEvent ? event.button + 1 : event.keyCode;
        this.keysDown.delete(keyCode);

        this.forwardToReceiver("keyup", {
            keyCode: keyCode,
            shift: event.shiftKey,
            alt: event.altKey,
        });
    }
}
