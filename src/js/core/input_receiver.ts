import { Signal } from "./signal";

export type KeydownEvent = {
    keyCode: number;
    shift: boolean;
    alt: boolean;
    ctrl: boolean;
    initial: boolean;
    event: KeyboardEvent | MouseEvent;
};
export type KeyupEvent = {
    keyCode: number;
    shift: boolean;
    alt: boolean;
};

export class InputReceiver {
    public backButton = new Signal();

    public keydown = new Signal<[KeydownEvent]>();
    public keyup = new Signal<[KeyupEvent]>();
    public pageBlur = new Signal();

    // Dispatched on destroy
    public destroyed = new Signal();

    public paste = new Signal<[ClipboardEvent]>();

    constructor(public context: string = "unknown") {}

    cleanup() {
        this.backButton.removeAll();
        this.keydown.removeAll();
        this.keyup.removeAll();
        this.paste.removeAll();

        this.destroyed.dispatch();
    }
}

export type ReceiverId = keyof {
    [K in keyof InputReceiver as InputReceiver[K] extends Signal<any[]>
        ? K extends "destroyed"
            ? never
            : K
        : never]: unknown;
};
