import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { scopeOptionsMigrationRule } from "../../src/rules/scope-options-migration.js";
import { SimpleTester } from "../tester.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    scopeOptionsMigrationRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

it("flags a legacy positional string scope argument", async () => {
  await tester
    .expect(
      `
      @clientName("RenamedName", "csharp")
      op myOperation(): void;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/scope-options-migration",
      severity: "warning",
    });
});

it("does not flag the options-bag form", async () => {
  await tester
    .expect(
      `
      @clientName("RenamedName", #{ scope: "csharp" })
      op myOperation(): void;
      `,
    )
    .toBeValid();
});

it("does not flag a decorator call with no scope argument", async () => {
  await tester
    .expect(
      `
      @clientName("RenamedName")
      op myOperation(): void;
      `,
    )
    .toBeValid();
});

it("does not flag unrelated decorators with a trailing string argument", async () => {
  await tester
    .expect(
      `
      @doc("some description")
      op myOperation(): void;
      `,
    )
    .toBeValid();
});

it("flags legacy scope on @access", async () => {
  await tester
    .expect(
      `
      @access(Access.internal, "csharp")
      op myOperation(): void;
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/scope-options-migration",
      severity: "warning",
    });
});

it("provides a code fix that rewrites the legacy scope to an options bag", async () => {
  await tester
    .expect(
      `
      @clientName("RenamedName", "csharp")
      op myOperation(): void;
    `,
    )
    .applyCodeFix("legacy-scope-to-options-bag").toEqual(`
      @clientName("RenamedName", #{ scope: "csharp" })
      op myOperation(): void;
    `);
});
