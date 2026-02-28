// @ts-check
import { defineConfig } from "eslint/config";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { TypeSpecCommonEslintConfigs, getTypeScriptProjectRules } from "./core/eslint.config.js";

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
    ],
  },
  ...TypeSpecCommonEslintConfigs,
  ...getTypeScriptProjectRules(dirname(fileURLToPath(import.meta.url))),
);
