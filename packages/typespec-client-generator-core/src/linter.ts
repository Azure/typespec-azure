import { defineLinter } from "@typespec/compiler";
import { noUnnamedTypesRule } from "./rules/no-unnamed-types.rule.js";
import { propertyNameConflictRule } from "./rules/property-name-conflict.rule.js";
import { requireClientSuffixRule } from "./rules/require-client-suffix.rule.js";
import { csharpReservedWordsRule } from "./rules/reserved-words/csharp.rule.js";
import { javaReservedWordsRule } from "./rules/reserved-words/java.rule.js";
import { javascriptReservedWordsRule } from "./rules/reserved-words/javascript.rule.js";
import { pythonReservedWordsRule } from "./rules/reserved-words/python.rule.js";

const rules = [
  requireClientSuffixRule,
  propertyNameConflictRule,
  noUnnamedTypesRule,
  csharpReservedWordsRule,
  pythonReservedWordsRule,
  javaReservedWordsRule,
  javascriptReservedWordsRule,
];

const csharpRules = [propertyNameConflictRule, csharpReservedWordsRule];
const pythonRules = [pythonReservedWordsRule];
const javaRules = [javaReservedWordsRule];
const javascriptRules = [javascriptReservedWordsRule];

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
