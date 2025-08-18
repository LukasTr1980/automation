// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  // Ignorieren
  { ignores: ["node_modules/**", "dist/**", "build/**"] },

  // JS-Empfehlungen
  js.configs.recommended,

  // TS-Empfehlungen
  ...tseslint.configs.recommended,

  // Projektweite Defaults + "unused vars"
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ]
    }
  }
];