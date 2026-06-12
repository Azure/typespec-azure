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
      "packages/typespec-java/**/*", // Has its own ESLint config
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
    // typespec-ts has static helper files which are copied verbatim into generated output and
    // intentionally keep camelCase names to match the upstream Azure SDK sources.
    files: ["packages/typespec-ts/static/**/*.ts", "packages/typespec-ts/static/**/*.mts"],
    rules: {
      "unicorn/filename-case": "off",
    },
  },
  {
    // Disable these project-aware rules for typespec-ts and typespec-java to prevent OOM
    files: [
      "packages/!(typespec-ts|typespec-java)/src/**/*.ts",
      "packages/!(typespec-ts|typespec-java)/src/**/*.tsx",
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
