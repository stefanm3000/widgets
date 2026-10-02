import { config as browserConfig } from "@pulse/eslint-config/browser";
import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";

export default [
  { ignores: [".svelte-kit/**", "build/**"] },
  ...browserConfig,
  ...svelte.configs.recommended,
  ...svelte.configs.prettier,
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: { parser: ts.parser },
    },
  },
];
