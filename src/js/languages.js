import zh_CN from "./built-temp/base-zh-CN.json";
import zh_TW from "./built-temp/base-zh-TW.json";
import ja from "./built-temp/base-ja.json";
import kor from "./built-temp/base-kor.json";
import cz from "./built-temp/base-cz.json";
import da from "./built-temp/base-da.json";
import de from "./built-temp/base-de.json";
import es from "./built-temp/base-es.json";
import fr from "./built-temp/base-fr.json";
import it from "./built-temp/base-it.json";
import hu from "./built-temp/base-hu.json";
import nl from "./built-temp/base-nl.json";
import no from "./built-temp/base-no.json";
import pl from "./built-temp/base-pl.json";
import pt_PT from "./built-temp/base-pt-PT.json";
import pt_BR from "./built-temp/base-pt-BR.json";
import ro from "./built-temp/base-ro.json";
import ru from "./built-temp/base-ru.json";
import fi from "./built-temp/base-fi.json";
import sv from "./built-temp/base-sv.json";
import tr from "./built-temp/base-tr.json";
import uk from "./built-temp/base-uk.json";
import he from "./built-temp/base-he.json";

/**
 * @type {Object<string, {name: string, data: any, code: string, region: string}>}
 */
export const LANGUAGES = {
    "en": {
        name: "English",
        data: null,
        code: "en",
        region: "",
    },

    "zh-CN": {
        // simplified chinese
        name: "简体中文",
        data: zh_CN,
        code: "zh",
        region: "CN",
    },

    "zh-TW": {
        // traditional chinese
        name: "繁體中文",
        data: zh_TW,
        code: "zh",
        region: "TW",
    },

    "ja": {
        // japanese
        name: "日本語",
        data: ja,
        code: "ja",
        region: "",
    },

    "kor": {
        // korean
        name: "한국어",
        data: kor,
        code: "ko",
        region: "",
    },

    "cs": {
        // czech
        name: "Čeština",
        data: cz,
        code: "cs",
        region: "",
    },

    "da": {
        // danish
        name: "Dansk",
        data: da,
        code: "da",
        region: "",
    },

    "de": {
        // german
        name: "Deutsch",
        data: de,
        code: "de",
        region: "",
    },

    "es-419": {
        // spanish
        name: "Español",
        data: es,
        code: "es",
        region: "",
    },

    "fr": {
        // french
        name: "Français",
        data: fr,
        code: "fr",
        region: "",
    },

    "it": {
        // italian
        name: "Italiano",
        data: it,
        code: "it",
        region: "",
    },

    "hu": {
        // hungarian
        name: "Magyar",
        data: hu,
        code: "hu",
        region: "",
    },

    "nl": {
        // dutch
        name: "Nederlands",
        data: nl,
        code: "nl",
        region: "",
    },

    "no": {
        // norwegian
        name: "Norsk",
        data: no,
        code: "no",
        region: "",
    },

    "pl": {
        // polish
        name: "Polski",
        data: pl,
        code: "pl",
        region: "",
    },

    "pt-PT": {
        // portuguese
        name: "Português",
        data: pt_PT,
        code: "pt",
        region: "PT",
    },

    "pt-BR": {
        // portuguese _ brazil
        name: "Português - Brasil",
        data: pt_BR,
        code: "pt",
        region: "BR",
    },

    "ro": {
        // romanian
        name: "Română",
        data: ro,
        code: "ro",
        region: "",
    },

    "ru": {
        // russian
        name: "Русский",
        data: ru,
        code: "ru",
        region: "",
    },

    "fi": {
        // finish
        name: "Suomi",
        data: fi,
        code: "fi",
        region: "",
    },

    "sv": {
        // swedish
        name: "Svenska",
        data: sv,
        code: "sv",
        region: "",
    },

    "tr": {
        // turkish
        name: "Türkçe",
        data: tr,
        code: "tr",
        region: "",
    },

    "uk": {
        // ukrainian
        name: "Українська",
        data: uk,
        code: "uk",
        region: "",
    },

    "he": {
        // hebrew
        name: "עברית",
        data: he,
        code: "he",
        region: "",
    },
};
