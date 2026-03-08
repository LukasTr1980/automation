import js from "@eslint/js";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

const tsRecommended = tsEslintPlugin.configs["flat/recommended"];

export default [
  {
    ignores: ["dist/**"],
  },
  js.configs.recommended,
  ...tsRecommended,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["src/components/snackbar/SnackbarContext.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
];
