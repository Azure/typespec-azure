// @ts-check
import tsEslint from "typescript-eslint";
import { TypeSpecCommonEslintConfigs } from "../../core/eslint.config.js";

export default tsEslint.config(
  {
    ignores: ["dist/**"],
  },
  ...TypeSpecCommonEslintConfigs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
