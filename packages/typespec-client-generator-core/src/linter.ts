import { defineLinter } from "@typespec/compiler";
import { requireClientSuffixRule } from "./rules/require-client-suffix.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.js";

const rules = [
  requireClientSuffixRule,
  propertyNameConflictRule,
]

const csharpRules = [
  propertyNameConflictRule
]


export const $linter = defineLinter({
  rules,
  ruleSets: {
    "best-practices:csharp": {
      enable: {
        ...Object.fromEntries(csharpRules.map(rule => [`@azure-tools/typespec-client-generator-core/${rule.name}`, true])),
      }
    }
  }
});
