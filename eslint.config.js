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
      "core/**/*", // The TypeSpec core submodule has its own ESLint config - don't lint it from here to avoid OOM
      "**/venv/**/*", // Ignore python virtual env
      "**/.vscode-test-web/**/*", // Ignore VSCode test web project
      // TODO: enable
      "**/.scripts/**/*",
      "eng/scripts/**/*",
      "packages/*/scripts/**/*",
      "packages/typespec-ts/**/*", // typespec-ts has its own linting config and is very large, so ignore it here to avoid OOM
    ],
  },
  ...TypeSpecCommonEslintConfigs,
  {
    files: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
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
