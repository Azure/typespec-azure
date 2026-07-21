import { defineLinter } from "@typespec/compiler";
import { csharpModelSuffixRule } from "./rules/csharp-model-suffix.js";
import { csharpNoUrlSuffixRule } from "./rules/csharp-no-url-suffix.js";
import { csharpUseStandardAcronymsRule } from "./rules/csharp-use-standard-acronyms.js";
import { noUnnamedTypesRule } from "./rules/no-unnamed-types.rule.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.rule.js";
import { requireClientSuffixRule } from "./rules/require-client-suffix.rule.js";

const rules = [
  requireClientSuffixRule,
  propertyNameConflictRule,
  noUnnamedTypesRule,
  csharpNoUrlSuffixRule,
  csharpModelSuffixRule,
  csharpUseStandardAcronymsRule,
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
