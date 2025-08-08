import { Mod } from "./mod";

/**
 * This {@link Mod} subclass is used to differentiate disabled mods and those
 * that couldn't be parsed or constructed due to an error.
 */
export class ErroredMod extends Mod {
    init(): void | Promise<void> {
        // Do nothing
    }
}
