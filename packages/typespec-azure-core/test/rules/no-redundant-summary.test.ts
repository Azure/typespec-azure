import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noRedundantSummaryRule } from "../../src/rules/no-redundant-summary.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noRedundantSummaryRule,
    "@azure-tools/typespec-azure-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-core/no-redundant-summary",
  severity: "warning",
  message:
    "The summary and documentation are identical. Add detail to the documentation or omit the redundant summary.",
} as const;

describe("no-redundant-summary", () => {
  describe.each([
    ["operation", "DECORATORS op read(): string;"],
    ["model", "DECORATORS model Widget {}"],
    ["model property", "model Widget { DECORATORS name: string; }"],
    ["operation parameter", "op read(DECORATORS name: string): string;"],
    ["scalar", "DECORATORS scalar WidgetName extends string;"],
    ["enum", "DECORATORS enum Color { red }"],
    ["enum member", "enum Color { DECORATORS red }"],
    ["union", "DECORATORS union Color { red: string }"],
    ["union variant", "union Color { DECORATORS red: string }"],
    ["interface", "DECORATORS interface Widgets {}"],
    ["namespace", "DECORATORS namespace Widgets {}"],
  ])("%s", (_, code) => {
    it("reports identical summary and documentation", async () => {
      await tester
        .expect(code.replace("DECORATORS", '@summary("Widgets") @doc("Widgets")'))
        .toEmitDiagnostics([diagnostic]);
    });

    it("accepts different summary and documentation", async () => {
      await tester
        .expect(
          code.replace("DECORATORS", '@summary("Widgets") @doc("Widgets visible to the caller.")'),
        )
        .toBeValid();
    });
  });

  it("reports equality after trimming surrounding whitespace", async () => {
    await tester
      .expect('@summary(" Read widgets ") @doc("Read widgets  ") op read(): string;')
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports whitespace-only values that are identical after trimming", async () => {
    await tester
      .expect('@summary(" ") @doc("  ") op read(): string;')
      .toEmitDiagnostics([diagnostic]);
  });

  it("reads documentation from doc comments", async () => {
    await tester
      .expect('/** Read widgets */ @summary("Read widgets") op read(): string;')
      .toEmitDiagnostics([diagnostic]);
  });

  it.each([
    ["different case", '@summary("Read widgets") @doc("read widgets")'],
    ["different punctuation", '@summary("Read widgets") @doc("Read widgets.")'],
    ["neither field", ""],
    ["only summary", '@summary("Read widgets")'],
    ["only documentation", '@doc("Read widgets")'],
    ["both empty", '@summary("") @doc("")'],
    ["empty summary", '@summary("") @doc("Read widgets")'],
    ["empty documentation", '@summary("Read widgets") @doc("")'],
  ])("accepts %s", async (_, decorators) => {
    await tester.expect(`${decorators} op read(): string;`).toBeValid();
  });
});
