import { Signal } from "./signal";

type KeyEvent = {
    keyCode: number;
    shift: boolean;
    alt: boolean;
    ctrl: boolean;
};

export class InputReceiver {
    public backButton = new Signal();

    public keydown = new Signal<[KeyEvent]>();
    public keyup = new Signal<[KeyEvent]>();
    public pageBlur = new Signal();

    // Dispatched on destroy
    public destroyed = new Signal();

    public paste = new Signal();

    constructor(public context: string = "unknown") {}

    cleanup() {
        this.backButton.removeAll();
        this.keydown.removeAll();
        this.keyup.removeAll();
        this.paste.removeAll();

        this.destroyed.dispatch();
    }
}
