import babelParser from "@babel/eslint-parser";
import { config as browserConfig } from "@pulse/eslint-config/browser";
import vue from "eslint-plugin-vue";

export default [
  ...browserConfig,
  ...vue.configs["flat/essential"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: babelParser,
        requireConfigFile: false,
        babelOptions: {
          presets: [["@babel/preset-typescript", { ignoreExtensions: true }]],
        },
      },
    },
    rules: {
      "no-undef": "off",
    },
  },
];
