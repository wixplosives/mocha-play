import { fixupPluginRules } from "@eslint/compat";
import pluginJs from "@eslint/js";
import configPrettier from "eslint-config-prettier";
import pluginNoOnlyTests from "eslint-plugin-no-only-tests";
import pluginTypescript from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ["dist/", "**/*.{js,mjs,cjs}"] },
  pluginJs.configs.recommended,

  ...pluginTypescript.configs.recommendedTypeChecked,
  { languageOptions: { parserOptions: { projectService: true } } },

  { plugins: { "no-only-tests": fixupPluginRules(pluginNoOnlyTests) } },
  configPrettier,

  {
    rules: {
      "no-only-tests/no-only-tests": "error",
    },
  },
];
