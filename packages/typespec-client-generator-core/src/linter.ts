import { defineLinter } from "@typespec/compiler";
import { requireClientSuffixRule } from "./rules/require-client-suffix.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.js";

const genericRules = [
  requireClientSuffixRule,
]

const csharpRules = [
  propertyNameConflictRule
]


export const $linter = defineLinter({
  rules: [
    ...genericRules,
    ...csharpRules,
  ],
  ruleSets: {
    "best-practices:csharp": {
      enable: {
        ...Object.fromEntries(csharpRules.map(rule => [`@azure-tools/typespec-client-generator-core/${rule.name}`, true])),
      }
    }
  }
});
