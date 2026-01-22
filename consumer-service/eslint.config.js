import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest
            },
            ecmaVersion: "latest",
            sourceType: "module"
        },
        rules: {
            "no-console": "warn",
            "no-unused-vars": "warn"
        }
    }
];
