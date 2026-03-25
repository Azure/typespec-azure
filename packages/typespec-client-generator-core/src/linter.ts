import { defineLinter } from "@typespec/compiler";
import { noReservedWordsRule } from "./rules/no-reserved-words.rule.js";
import { noUnnamedTypesRule } from "./rules/no-unnamed-types.rule.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.rule.js";
import { requireClientSuffixRule } from "./rules/require-client-suffix.rule.js";

const rules = [
  requireClientSuffixRule,
  propertyNameConflictRule,
  noUnnamedTypesRule,
  noReservedWordsRule,
];

const csharpRules = [propertyNameConflictRule, noReservedWordsRule];
const pythonRules = [noReservedWordsRule];
const javaRules = [noReservedWordsRule];
const javascriptRules = [noReservedWordsRule];

function createRuleSet(langRules: typeof rules) {
  return {
    enable: {
      ...Object.fromEntries(
        langRules.map((rule) => [`@azure-tools/typespec-client-generator-core/${rule.name}`, true]),
      ),
    },
  };
}

export const $linter = defineLinter({
  rules,
  ruleSets: {
    "best-practices:csharp": createRuleSet(csharpRules),
    "best-practices:python": createRuleSet(pythonRules),
    "best-practices:java": createRuleSet(javaRules),
    "best-practices:javascript": createRuleSet(javascriptRules),
  },
});
