import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const baseConfig = tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    // Enable type-aware linting
    {
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    // Disable type-aware linting for JS files as it causes issues
    {
        files: ["*.js"],
        ...tseslint.configs.disableTypeChecked,
    }
);

const nodeConfig = tseslint.config(...baseConfig, {
    languageOptions: {
        sourceType: "module",
        globals: {
            ...globals.node,
        },
    },
});

const runtimeConfig = tseslint.config(...baseConfig, {
    languageOptions: {
        sourceType: "module",
        globals: {
            ...globals.browser,
        },
    },
    rules: {
        // Mostly caused by JSDoc imports, disable for now
        "@typescript-eslint/no-unused-vars": "off",
        // FIXME: enforce when we're ready to
        "prefer-const": "warn",
    },
});

// I don't know what the ESLint devs were thinking about. This is just horrible
export default [
    {
        ignores: ["build/*"],
    },
    ...nodeConfig.map(config => ({
        ...config,
        files: ["*.{ts,js}", "{gulp,electron}/**/*.{ts,js}"],
    })),
    ...runtimeConfig.map(config => ({
        ...config,
        files: ["src/**/*.{ts,js,tsx,jsx}"],
    })),
];
