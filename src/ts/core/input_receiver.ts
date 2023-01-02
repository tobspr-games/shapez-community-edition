import { Signal } from "./signal";

export class InputReceiver {
    public backButton = new Signal();

    public keydown = new Signal<[{ keyCode: number; shift: boolean; alt: boolean; ctrl: boolean; }]>();
    public keyup = new Signal();
    public pageBlur = new Signal();

    //// Dispatched on destroy
    public destroyed = new Signal();

    public paste = new Signal();

    constructor(public context = "unknown") { }

    cleanup() {
        this.backButton.removeAll();
        this.keydown.removeAll();
        this.keyup.removeAll();
        this.paste.removeAll();

        this.destroyed.dispatch();
    }
}
