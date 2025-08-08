export interface Language {
    name: string;
    code: string;
    region: string;
    overrides?: object;
}

export const LANGUAGES: Record<string, Language> = {
    "en": {
        name: "English",
        code: "en",
        region: "",
    },

    "zh-CN": {
        // simplified chinese
        name: "简体中文",
        code: "zh",
        region: "CN",
    },

    "zh-TW": {
        // traditional chinese
        name: "繁體中文",
        code: "zh",
        region: "TW",
    },

    "ja": {
        // japanese
        name: "日本語",
        code: "ja",
        region: "",
    },

    "kor": {
        // korean
        name: "한국어",
        code: "ko",
        region: "",
    },

    "cs": {
        // czech
        name: "Čeština",
        code: "cs",
        region: "",
    },

    "da": {
        // danish
        name: "Dansk",
        code: "da",
        region: "",
    },

    "de": {
        // german
        name: "Deutsch",
        code: "de",
        region: "",
    },

    "es-419": {
        // spanish
        name: "Español",
        code: "es",
        region: "",
    },

    "fr": {
        // french
        name: "Français",
        code: "fr",
        region: "",
    },

    "it": {
        // italian
        name: "Italiano",
        code: "it",
        region: "",
    },

    "hu": {
        // hungarian
        name: "Magyar",
        code: "hu",
        region: "",
    },

    "nl": {
        // dutch
        name: "Nederlands",
        code: "nl",
        region: "",
    },

    "no": {
        // norwegian
        name: "Norsk",
        code: "no",
        region: "",
    },

    "pl": {
        // polish
        name: "Polski",
        code: "pl",
        region: "",
    },

    "pt-PT": {
        // portuguese
        name: "Português",
        code: "pt",
        region: "PT",
    },

    "pt-BR": {
        // portuguese _ brazil
        name: "Português - Brasil",
        code: "pt",
        region: "BR",
    },

    "ro": {
        // romanian
        name: "Română",
        code: "ro",
        region: "",
    },

    "ru": {
        // russian
        name: "Русский",
        code: "ru",
        region: "",
    },

    "fi": {
        // finish
        name: "Suomi",
        code: "fi",
        region: "",
    },

    "sv": {
        // swedish
        name: "Svenska",
        code: "sv",
        region: "",
    },

    "tr": {
        // turkish
        name: "Türkçe",
        code: "tr",
        region: "",
    },

    "uk": {
        // ukrainian
        name: "Українська",
        code: "uk",
        region: "",
    },

    "he": {
        // hebrew
        name: "עברית",
        code: "he",
        region: "",
    },

    "ar": {
        // arabic
        name: "العربية",
        code: "ar",
        region: "",
    },
};
