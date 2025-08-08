import { Mod } from "./mod";

export class DisabledMod extends Mod {
    init(): void | Promise<void> {
        // Do nothing
    }
}
