import { Tester } from "#test/tester.js";
import { expect, it } from "vitest";
import { $linter } from "../src/linter.js";

const code = "@azure-tools/typespec-azure-resource-manager/use-scope-for-extension-routing";
const source = `
  @get
  @route("/providers/Microsoft.Parent/parents/{parentName}/providers/Microsoft.Test/bindings/{bindingName}")
  op read(@path parentName: string, @path bindingName: string): void;
`;

it("uses the compiler-provided all ruleset", () => {
  expect($linter.ruleSets?.all).toBeUndefined();
  expect($linter.rules.some((rule) => rule.name === "use-scope-for-extension-routing")).toBe(true);
});

it("enables extension routing through ARM all", async () => {
  const [, diagnostics] = await Tester.compileAndDiagnose(source, {
    compilerOptions: {
      linterRuleSet: {
        extends: ["@azure-tools/typespec-azure-resource-manager/all"],
      },
    },
  });
  expect(diagnostics.filter((diagnostic) => diagnostic.code === code)).toHaveLength(1);
});

it("allows projects to disable extension routing when extending ARM all", async () => {
  const [, diagnostics] = await Tester.compileAndDiagnose(source, {
    compilerOptions: {
      linterRuleSet: {
        extends: ["@azure-tools/typespec-azure-resource-manager/all"],
        disable: { [code]: "This service does not use RPaaS extension routing." },
      },
    },
  });
  expect(diagnostics.filter((diagnostic) => diagnostic.code === code)).toHaveLength(0);
});
