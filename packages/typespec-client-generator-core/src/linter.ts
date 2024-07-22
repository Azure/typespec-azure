import { defineLinter } from "@typespec/compiler";
import { propertyNameConflictRule } from "./rules/property-name-conflict.rule.js";
import { requireClientSuffixRule } from "./rules/require-client-suffix.rule.js";

const rules = [requireClientSuffixRule, propertyNameConflictRule];

const csharpRules = [propertyNameConflictRule];

export const $linter = defineLinter({
  rules,
  ruleSets: {
    "best-practices:csharp": {
      enable: {
        ...Object.fromEntries(
          csharpRules.map((rule) => [
            `@azure-tools/typespec-client-generator-core/${rule.name}`,
            true,
          ])
        ),
      },
    },
  },
});
