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
      "packages/typespec-ts/test/*/generated/**/*",
      "packages/typespec-ts/src/modular/static/**/*",
    ],
  },
  ...TypeSpecCommonEslintConfigs,
  {
    // Disable these project-aware rules for typespec-ts to prevent OOM
    files: ["packages/!(typespec-ts)/src/**/*.ts", "packages/!(typespec-ts)/src/**/*.tsx"],
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
  {
    files: ["packages/typespec-ts/**/*.ts"],
    rules: {
      "unicorn/filename-case": "off",
    },
  },
);
