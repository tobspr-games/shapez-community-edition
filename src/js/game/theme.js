import dark from "./themes/dark.json";
import light from "./themes/light.json";

export const THEMES = {
    dark,
    light,
};

export let THEME = THEMES.light;

export function applyGameTheme(id) {
    THEME = THEMES[id];
}
