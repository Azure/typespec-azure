import { resolvePath } from "@typespec/compiler";
import { createTester, expectDiagnostics } from "@typespec/compiler/testing";
import { ok } from "node:assert";
import { it } from "vitest";
import { $linter } from "../src/index.js";

const ruleName = "@azure-tools/typespec-client-generator-core/use-model-inheritance";
const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@azure-tools/typespec-azure-rulesets",
    "@azure-tools/typespec-client-generator-core",
  ],
  features: ["union-extends"],
  compilerOptions: {
    linterRuleSet: {
      extends: ["@azure-tools/typespec-azure-rulesets/client-sdk"],
    },
  },
});

it("enables model inheritance guidance only in client-sdk", async () => {
  for (const rulesetName of ["data-plane", "resource-manager"]) {
    ok(!$linter.ruleSets?.[rulesetName].enable?.[ruleName]);
  }
  const diagnostics = await Tester.diagnose(`
    model Base { id: string; }
    model Derived extends Base {}
    model Copy is Base;
    union Choice extends Base { derived: Derived, invalid: Copy }
  `);
  expectDiagnostics(diagnostics, [
    {
      code: ruleName,
      severity: "warning",
      message:
        "Model variant must be 'Base' or explicitly inherit from it. Use 'model extends Base' instead of relying on structural compatibility.",
      target: "invalid",
    },
  ]);
}, 10000);

it("supports suppression on the offending variant without suppressing its siblings", async () => {
  const diagnostics = await Tester.diagnose(`
    model Base { id: string; }
    model Copy is Base;
    union Choice extends Base {
      #suppress "${ruleName}" "Existing SDK compatibility requires retaining this shape."
      suppressed: Copy,
      invalid: Copy,
    }
  `);
  expectDiagnostics(diagnostics, [{ code: ruleName, target: "invalid" }]);
});

it("leaves invalid compiler constraints to the compiler", async () => {
  const diagnostics = await Tester.diagnose(`
    model Base { id: string; }
    model Missing {}
    union Choice extends Base { invalid: Missing }
  `);
  expectDiagnostics(diagnostics, [{ code: "unassignable", severity: "error" }]);
});
