import { defineLinter } from "@typespec/compiler";
import { csharpNoUrlSuffixRule } from "./rules/csharp-no-url-suffix.js";
import { noUnnamedTypesRule } from "./rules/no-unnamed-types.rule.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.rule.js";
import { requireClientSuffixRule } from "./rules/require-client-suffix.rule.js";
import { singleWordModelNameRule } from "./rules/single-word-model-name.js";

const rules = [
  requireClientSuffixRule,
  propertyNameConflictRule,
  noUnnamedTypesRule,
  csharpNoUrlSuffixRule,
  singleWordModelNameRule,
];

const csharpRules = [propertyNameConflictRule, csharpNoUrlSuffixRule, singleWordModelNameRule];

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
