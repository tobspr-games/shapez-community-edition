export type TrackedStateCallback<T> = (value: T) => void;

export class TrackedState<T> {
    public lastSeenValue: T = null;
    public callback: TrackedStateCallback<T>;

    constructor(callbackMethod: TrackedStateCallback<T> = null, callbackScope: unknown = null) {
        if (callbackMethod) {
            this.callback = callbackMethod;
            if (callbackScope) {
                this.callback = this.callback.bind(callbackScope);
            }
        }
    }

    set(value: T, changeHandler: TrackedStateCallback<T> = null, changeScope: unknown = null) {
        if (value !== this.lastSeenValue) {
            // Copy value since the changeHandler call could actually modify our lastSeenValue
            const valueCopy = value;
            this.lastSeenValue = value;
            if (changeHandler) {
                if (changeScope) {
                    changeHandler.call(changeScope, valueCopy);
                } else {
                    changeHandler(valueCopy);
                }
            } else if (this.callback) {
                this.callback(value);
            } else {
                assert(false, "No callback specified");
            }
        }
    }

    setSilent(value: T) {
        this.lastSeenValue = value;
    }

    get(): T {
        return this.lastSeenValue;
    }
}
