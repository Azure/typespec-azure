import { defineLinter } from "@typespec/compiler";
import { csharpNoOptionsSuffixRule } from "./rules/csharp-no-options-suffix.js";
import { csharpNoRequestSuffixRule } from "./rules/csharp-no-request-suffix.js";
import { csharpNoResponseSuffixRule } from "./rules/csharp-no-response-suffix.js";
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
  csharpNoOptionsSuffixRule,
  csharpNoRequestSuffixRule,
  csharpNoResponseSuffixRule,
  csharpUseStandardAcronymsRule,
];

const csharpRules = [propertyNameConflictRule, csharpNoUrlSuffixRule];

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
