import { T } from "@/translations";

export function keyToKeyCode(key: string) {
    return key.toUpperCase().charCodeAt(0);
}

export const KEYCODES = {
    Tab: 9,
    Enter: 13,

    Shift: 16,
    Ctrl: 17,
    Alt: 18,

    Escape: 27,

    Space: 32,

    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,

    Delete: 46,

    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,

    Plus: 187,
    Minus: 189,
};

export const KEYCODE_LMB = 1;
export const KEYCODE_MMB = 2;
export const KEYCODE_RMB = 3;

export function getStringForKeyCode(code: number): string {
    // @todo: Refactor into dictionary
    switch (code) {
        case KEYCODE_LMB:
            return "LMB";
        case KEYCODE_MMB:
            return "MMB";
        case KEYCODE_RMB:
            return "RMB";
        case 4:
            return "MB4";
        case 5:
            return "MB5";
        case 8:
            return "⌫";
        case KEYCODES.Tab:
            return T.global.keys.tab;
        case KEYCODES.Enter:
            return "⏎";
        case KEYCODES.Shift:
            return "⇪";
        case KEYCODES.Ctrl:
            return T.global.keys.control;
        case KEYCODES.Alt:
            return T.global.keys.alt;
        case 19:
            return "PAUSE";
        case 20:
            return "CAPS";
        case KEYCODES.Escape:
            return T.global.keys.escape;
        case KEYCODES.Space:
            return T.global.keys.space;
        case 33:
            return "PGUP";
        case 34:
            return "PGDOWN";
        case 35:
            return "END";
        case 36:
            return "HOME";
        case KEYCODES.ArrowLeft:
            return "⬅";
        case KEYCODES.ArrowUp:
            return "⬆";
        case KEYCODES.ArrowRight:
            return "➡";
        case KEYCODES.ArrowDown:
            return "⬇";
        case 44:
            return "PRNT";
        case 45:
            return "INS";
        case 46:
            return "DEL";
        case 93:
            return "SEL";
        case 96:
            return "NUM 0";
        case 97:
            return "NUM 1";
        case 98:
            return "NUM 2";
        case 99:
            return "NUM 3";
        case 100:
            return "NUM 4";
        case 101:
            return "NUM 5";
        case 102:
            return "NUM 6";
        case 103:
            return "NUM 7";
        case 104:
            return "NUM 8";
        case 105:
            return "NUM 9";
        case 106:
            return "*";
        case 107:
            return "+";
        case 109:
            return "-";
        case 110:
            return ".";
        case 111:
            return "/";
        case KEYCODES.F1:
            return "F1";
        case KEYCODES.F2:
            return "F2";
        case KEYCODES.F3:
            return "F3";
        case KEYCODES.F4:
            return "F4";
        case KEYCODES.F5:
            return "F5";
        case KEYCODES.F6:
            return "F6";
        case KEYCODES.F7:
            return "F7";
        case KEYCODES.F8:
            return "F8";
        case KEYCODES.F9:
            return "F9";
        case KEYCODES.F10:
            return "F10";
        case KEYCODES.F11:
            return "F11";
        case KEYCODES.F12:
            return "F12";

        case 144:
            return "NUMLOCK";
        case 145:
            return "SCRLOCK";
        case 182:
            return "COMP";
        case 183:
            return "CALC";
        case 186:
            return ";";
        case 187:
            return "+";
        case 188:
            return ",";
        case 189:
            return "-";
        case 190:
            return ".";
        case 191:
            return "/";
        case 192:
            return "`";
        case 219:
            return "[";
        case 220:
            return "\\";
        case 221:
            return "]";
        case 222:
            return "'";
    }

    return (48 <= code && code <= 57) || (65 <= code && code <= 90)
        ? String.fromCharCode(code)
        : "[" + code + "]";
}
