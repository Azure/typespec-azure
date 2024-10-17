import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noQueryExplodeRule } from "../../src/rules/no-query-explode.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner();
  tester = createLinterRuleTester(runner, noQueryExplodeRule, "@azure-tools/typespec-azure-core");
});

it("emit warning if using * modifier", async () => {
  await tester.expect(`@route("abc{?select*}") op foo(select: string[]): void;`).toEmitDiagnostics({
    code: "@azure-tools/typespec-azure-core/no-query-explode",
  });
});

it("emit warning if using explode: true", async () => {
  await tester
    .expect(`op foo(@query(#{explode: true}) select: string[]): void;`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-query-explode",
    });
});

it("is ok if query param doesn't specify explode", async () => {
  await tester.expect(`op foo(@query select: string[]): void;`).toBeValid();
});
it("is ok if query param specify explode: false", async () => {
  await tester.expect(`op foo(@query(#{explode: false}) select: string[]): void;`).toBeValid();
});
