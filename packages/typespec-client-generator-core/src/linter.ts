import { defineLinter } from "@typespec/compiler";
import { csharpNoTypeNameConflictRule } from "./rules/csharp-no-type-name-conflict.js";
import { csharpNoUrlSuffixRule } from "./rules/csharp-no-url-suffix.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.rule.js";
import { requireClientSuffixRule } from "./rules/require-client-suffix.rule.js";

const rules = [
  requireClientSuffixRule,
  propertyNameConflictRule,
  csharpNoUrlSuffixRule,
  csharpNoTypeNameConflictRule,
];

const csharpRules = [propertyNameConflictRule, csharpNoUrlSuffixRule, csharpNoTypeNameConflictRule];

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
