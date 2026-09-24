import { defineLinter } from "@typespec/compiler";
import { csharpModelSuffixRule } from "./rules/csharp-model-suffix.js";
import { csharpNoUrlSuffixRule } from "./rules/csharp-no-url-suffix.js";
import { csharpUseStandardAcronymsRule } from "./rules/csharp-use-standard-acronyms.js";
import { getOperationNameRule } from "./rules/get-operation-name.rule.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.rule.js";
import { requireClientSuffixRule } from "./rules/require-client-suffix.rule.js";
import { useCreateForPutRule } from "./rules/use-create-for-put.js";
import { useModelInheritanceRule } from "./rules/use-model-inheritance.js";

const rules = [
  useCreateForPutRule,
  requireClientSuffixRule,
  propertyNameConflictRule,
  csharpNoUrlSuffixRule,
  csharpModelSuffixRule,
  csharpUseStandardAcronymsRule,
  getOperationNameRule,
  useModelInheritanceRule,
];

const csharpRules = [
  propertyNameConflictRule,
  csharpNoUrlSuffixRule,
  csharpModelSuffixRule,
  csharpUseStandardAcronymsRule,
];

export const $linter = defineLinter({
  rules,
  ruleSets: {
    "best-practices:csharp": {
      enable: {
        ...Object.fromEntries(
          csharpRules.map((rule) => [
            `@azure-tools/typespec-client-generator-core/${rule.name}`,
            true,
          ]),
        ),
      },
    },
  },
});
