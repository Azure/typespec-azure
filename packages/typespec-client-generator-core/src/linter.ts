import { defineLinter } from "@typespec/compiler";
import { csharpModelSuffixRule } from "./rules/csharp-model-suffix.js";
import { csharpNoUrlSuffixRule } from "./rules/csharp-no-url-suffix.js";
import { csharpUseStandardAcronymsRule } from "./rules/csharp-use-standard-acronyms.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.rule.js";
import { requireClientSuffixRule } from "./rules/require-client-suffix.rule.js";
import { scopeOptionsMigrationRule } from "./rules/scope-options-migration.js";

const rules = [
  requireClientSuffixRule,
  propertyNameConflictRule,
  csharpNoUrlSuffixRule,
  csharpModelSuffixRule,
  csharpUseStandardAcronymsRule,
  scopeOptionsMigrationRule,
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
