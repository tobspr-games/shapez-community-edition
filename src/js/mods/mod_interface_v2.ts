import { Mod } from "./mod";
import { ModInterface } from "./mod_interface";
import { ModLoader } from "./modloader";

export class ModInterfaceV2 extends ModInterface {
    private readonly mod: Mod;
    private readonly baseUrl: string;

    constructor(mod: Mod, modLoader: ModLoader) {
        super(modLoader);
        this.mod = mod;
        this.baseUrl = `mod://${mod.id}`;
    }

    resolve(path: string) {
        path = path
            .split("/")
            .map(p => encodeURIComponent(p))
            .join("/");

        if (!path.startsWith("./")) {
            // Assume relative if not specified
            path = `./${path}`;
        }

        // Cannot use import.meta in webpack context
        return new URL(path, this.baseUrl).toString();
    }

    addStylesheet(path: string) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = this.resolve(path);
        link.setAttribute("data-mod-id", this.mod.id);

        document.head.append(link);
    }
}
