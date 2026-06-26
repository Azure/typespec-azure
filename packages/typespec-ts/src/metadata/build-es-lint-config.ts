// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Project } from "ts-morph";
import { ClientModel } from "../interfaces.js";

const esLintConfigEsmAzureSdk = `import azsdkEslint from "@azure/eslint-plugin-azure-sdk";

export default [
  ...azsdkEslint.config([
    {
      rules: {
        "@azure/azure-sdk/ts-modules-only-named": "warn",
        "@azure/azure-sdk/ts-package-json-types": "warn",
        "@azure/azure-sdk/ts-package-json-engine-is-present": "warn",
        "@azure/azure-sdk/ts-package-json-files-required": "off",
        "@azure/azure-sdk/ts-package-json-main-is-cjs": "off",
        "tsdoc/syntax": "warn"
      }
    },
  ]),
  {
    files: ["src/**/*.ts", "src/**/*.mts", "test/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./config/tsconfig.lint.json",
      },
    },
  },
];
`;

export function buildEsLintConfig(_model: ClientModel) {
  const project = new Project({ useInMemoryFileSystem: true });
  const filePath = "eslint.config.mjs";

  const configFile = project.createSourceFile("eslint.config.mjs", esLintConfigEsmAzureSdk, {
    overwrite: true,
  });
  return {
    path: filePath,
    content: configFile.getFullText(),
  };
}
