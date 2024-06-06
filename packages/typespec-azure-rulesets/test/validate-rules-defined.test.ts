import { $lib as AzureCoreLib, $linter as AzureCoreLinter } from "@azure-tools/typespec-azure-core";
import {
  $lib as ResourceManagerLib,
  $linter as ResourceManagerLinter,
} from "@azure-tools/typespec-azure-resource-manager";
import type { LinterDefinition } from "@typespec/compiler";
import { fail, ok } from "node:assert";
import { describe, it } from "vitest";
import { $linter } from "../src/index.js";

interface DependingLinter {
  name: string;
  linter: LinterDefinition;
}

const linters = {
  azureCore: {
    name: AzureCoreLib.name,
    linter: AzureCoreLinter,
  } satisfies DependingLinter,
  resourceManager: {
    name: ResourceManagerLib.name,
    linter: ResourceManagerLinter,
  } satisfies DependingLinter,
};

describe("expect all rules to be defined", () => {
  describe.each([
    ["data-plane", [linters.azureCore]],
    ["resource-manager", [linters.azureCore, linters.resourceManager]],
  ])("%s ruleset", (rulesetName, linters: DependingLinter[]) => {
    it.each(linters)("rules from $name", ({ name, linter }) => {
      const ruleset = $linter.ruleSets?.[rulesetName];
      ok(ruleset);

      const missing = [];
      for (const rule of linter.rules) {
        const fullName = `${name}/${rule.name}` as const;
        if (ruleset.enable?.[fullName] === undefined && ruleset.disable?.[fullName] === undefined) {
          missing.push(fullName);
        }
      }
      if (missing.length === 0) {
        ok(true, "All rules are defined");
      } else {
        const missingRuleList = missing.map((x) => `  ${x}`).join("\n");
        fail(
          `Ruleset '${name}' is missing the follow rules. They need to be explicitly defined in enabled or disabled:\n${missingRuleList}`
        );
      }
    });
  });
});
