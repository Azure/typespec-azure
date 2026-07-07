import { defineLinter } from "@typespec/compiler";
import { csharpNoSingleWordModelNameRule } from "./rules/csharp-no-single-word-model-name.js";
import { csharpNoUrlSuffixRule } from "./rules/csharp-no-url-suffix.js";
import { noUnnamedTypesRule } from "./rules/no-unnamed-types.rule.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.rule.js";
import { requireClientSuffixRule } from "./rules/require-client-suffix.rule.js";

const rules = [
  requireClientSuffixRule,
  propertyNameConflictRule,
  noUnnamedTypesRule,
  csharpNoUrlSuffixRule,
  csharpNoSingleWordModelNameRule,
];

const csharpRules = [
  propertyNameConflictRule,
  csharpNoUrlSuffixRule,
  csharpNoSingleWordModelNameRule,
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
