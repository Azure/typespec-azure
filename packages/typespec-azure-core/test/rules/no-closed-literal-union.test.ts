import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noClosedLiteralUnionRule } from "../../src/rules/no-closed-literal-union.js";

describe("typespec-azure-core: no-closed-literal-union rule", () => {
  let tester: LinterRuleTester;

  beforeEach(async () => {
    const runner = await Tester.createInstance();
    tester = createLinterRuleTester(
      runner,
      noClosedLiteralUnionRule,
      "@azure-tools/typespec-azure-core",
    );
  });

  it("emits a warning diagnostic if union only contains literals", async () => {
    await tester.expect(`union PetKind { "cat", "dog" }`).toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-closed-literal-union",
      },
    ]);
  });
  it("emits a warning diagnostic if union expression only contains literals", async () => {
    await tester.expect(`model Pet { kind: "cat" | "dog" }`).toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-closed-literal-union",
      },
    ]);
  });

  it("pass if the union contains the base scalar", async () => {
    await tester.expect(`union PetKind { "cat", "dog", string }`).toBeValid();
  });

  it("pass if the union expression contains the base scalar", async () => {
    await tester.expect(`model Pet { kind: "cat" | "dog" | string }`).toBeValid();
  });
});
