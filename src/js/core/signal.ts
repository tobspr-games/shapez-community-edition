export const STOP_PROPAGATION = "stop_propagation" as const;
export type STOP_PROPAGATION = typeof STOP_PROPAGATION;

export type SignalReceiver<T extends unknown[]> = (...args: T) => STOP_PROPAGATION | void;

export class Signal<T extends unknown[] = []> {
    public receivers: { receiver: SignalReceiver<T>; scope: object }[] = [];
    public modifyCount: number = 0;

    /**
     * Adds a new signal listener
     */
    add(receiver: SignalReceiver<T>, scope: object = null) {
        assert(receiver, "receiver is null");
        this.receivers.push({ receiver, scope });
        ++this.modifyCount;
    }

    /**
     * Adds a new signal listener
     */
    addToTop(receiver: SignalReceiver<T>, scope: object = null) {
        assert(receiver, "receiver is null");
        this.receivers.unshift({ receiver, scope });
        ++this.modifyCount;
    }

    /**
     * Dispatches the signal
     */
    dispatch(...payload: T): void | STOP_PROPAGATION {
        const modifyState = this.modifyCount;

        const n = this.receivers.length;
        for (let i = 0; i < n; ++i) {
            const { receiver, scope } = this.receivers[i];
            if (receiver.apply(scope, payload) === STOP_PROPAGATION) {
                return STOP_PROPAGATION;
            }

            if (modifyState !== this.modifyCount) {
                // Signal got modified during iteration
                return STOP_PROPAGATION;
            }
        }
    }

    /**
     * Removes a receiver
     */
    remove(receiver: SignalReceiver<T>) {
        let index = null;
        const n = this.receivers.length;
        for (let i = 0; i < n; ++i) {
            if (this.receivers[i].receiver === receiver) {
                index = i;
                break;
            }
        }
        assert(index !== null, "Receiver not found in list");
        this.receivers.splice(index, 1);
        ++this.modifyCount;
    }

    /**
     * Removes all receivers
     */
    removeAll() {
        this.receivers = [];
        ++this.modifyCount;
    }
}
