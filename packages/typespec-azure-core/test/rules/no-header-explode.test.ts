import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noHeaderExplodeRule } from "../../src/rules/no-header-explode.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner();
  tester = createLinterRuleTester(runner, noHeaderExplodeRule, "@azure-tools/typespec-azure-core");
});

it("emit warning if using explode: true", async () => {
  await tester
    .expect(`op foo(@header(#{explode: true}) select: string[]): void;`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-header-explode",
    });
});

it("is ok if header param doesn't specify explode", async () => {
  await tester.expect(`op foo(@header select: string[]): void;`).toBeValid();
});
it("is ok if header param specify explode: false", async () => {
  await tester.expect(`op foo(@header(#{explode: false}) select: string[]): void;`).toBeValid();
});
