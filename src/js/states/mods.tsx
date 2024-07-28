import { Mod } from "@/mods/mod";
import { MODS } from "@/mods/modloader";
import { TextualGameState } from "../core/textual_game_state";
import { T } from "../translations";

export class ModsState extends TextualGameState {
    constructor() {
        super("ModsState");
    }

    getStateHeaderTitle() {
        return T.mods.title;
    }

    protected getInitialContent() {
        const modElements = MODS.mods.map(mod => this.getModElement(mod));

        return (
            <div class="content">
                <div class={`modsGrid${MODS.anyModsActive() ? "" : " noMods"}`}>
                    {MODS.anyModsActive() ? modElements : this.getNoModsMessage()}
                </div>
            </div>
        );
    }

    private getModElement(mod: Mod): HTMLElement {
        // TODO: Ensure proper design and localization once mods are reworked
        return (
            <div class="mod">
                <div class="title">
                    <b>{mod.metadata.name}</b> by <i>{mod.metadata.author}</i>
                </div>
                <div class="description">{mod.metadata.description}</div>
                <div class="advanced">
                    {mod.metadata.id} @ {mod.metadata.version}
                </div>
            </div>
        );
    }

    private getNoModsMessage(): HTMLElement {
        return <div class="noModsMessage">No mods are currently installed.</div>;
    }

    getDefaultPreviousState() {
        return "SettingsState";
    }
}
