// @ts-check
import { dirname } from "path";
import tsEslint from "typescript-eslint";
import { fileURLToPath } from "url";
import { TypeSpecCommonEslintConfigs, getTypeScriptProjectRules } from "./core/eslint.config.js";

export default tsEslint.config(
  {
    ignores: [
      "**/dist/**/*",
      "**/.temp/**/*",
      "**/temp/**/*",
      "**/generated-defs/*",
      "**/website/build/**/*",
      "**/.docusaurus/**/*",
      "core/packages/compiler/templates/**/*", // Ignore the templates which might have invalid code and not follow exactly our rules.
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
  ...getTypeScriptProjectRules(dirname(fileURLToPath(import.meta.url))),
);
