// @ts-check
import { defineConfig } from "eslint/config";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { TypeSpecCommonEslintConfigs } from "./core/eslint.config.js";

export default defineConfig(
  {
    ignores: [
      "**/dist/**/*",
      "**/.temp/**/*",
      "**/temp/**/*",
      "**/generated-defs/*",
      "**/website/build/**/*",
      "**/.astro/**/*",
      "core/packages/compiler/templates/**/*", // Ignore the templates which might have invalid code and not follow exactly our rules.
      "core/packages/typespec-vscode/templates/**/*", // Ignore the templates which might have invalid code and not follow exactly our rules.
      "**/venv/**/*", // Ignore python virtual env
      "**/.vscode-test-web/**/*", // Ignore VSCode test web project
      // TODO: enable
      "**/.scripts/**/*",
      "eng/scripts/**/*",
      "core/eng/common/scripts/**/*",
      "core/eng/tsp-core/scripts/**/*",
      "packages/*/scripts/**/*",
      "core/packages/*/scripts/**/*",
    ],
  },
  ...TypeSpecCommonEslintConfigs,
  // Type-checked rules scoped to Azure packages only (not core/**) to avoid OOM
  {
    files: [
      "packages/*/src/**/*.ts",
      "packages/*/src/**/*.tsx",
      "packages/*/emitter/src/**/*.ts",
    ],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["packages/*/vitest.config.ts"],
        },
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
      },
    },
    rules: {
      // Only put rules here that need typescript project information
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-deprecated": "warn",
    },
  },
);
