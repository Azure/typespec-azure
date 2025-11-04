import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noCaseMismatchRule } from "../../src/rules/no-case-mismatch.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, noCaseMismatchRule, "@azure-tools/typespec-azure-core");
});

describe("flags models with names that just differ by casing", () => {
  it.each(["model", "enum", "union"])("%s", async (type) => {
    await tester
      .expect(
        `
        ${type} FailOverProperties {}
        ${type} FailoverProperties {}
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-case-mismatch",
          message:
            "Type 'FailOverProperties' has a name that differs only by casing from another type: FailoverProperties",
        },
        {
          code: "@azure-tools/typespec-azure-core/no-case-mismatch",
          message:
            "Type 'FailoverProperties' has a name that differs only by casing from another type: FailOverProperties",
        },
      ]);
  });
});

it("flags 3 or more types", async () => {
  await tester
    .expect(
      `
        model FailOverProperties {}
        model FailoverProperties {}
        model Failoverproperties {}
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-case-mismatch",
        message:
          "Type 'FailOverProperties' has a name that differs only by casing from another type: FailoverProperties, Failoverproperties",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-case-mismatch",
        message:
          "Type 'FailoverProperties' has a name that differs only by casing from another type: FailOverProperties, Failoverproperties",
      },
      {
        code: "@azure-tools/typespec-azure-core/no-case-mismatch",
        message:
          "Type 'Failoverproperties' has a name that differs only by casing from another type: FailOverProperties, FailoverProperties",
      },
    ]);
});

it("doesn't flag if names are differ by more than casing", async () => {
  await tester
    .expect(
      `
        model FailedOver {}
        model FailOver {}
      `,
    )
    .toBeValid();
});
