import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { unsupportedTypeRule } from "../../src/rules/unsupported-type.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    unsupportedTypeRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

async function expectUnsupportedType(type: string, code: string) {
  await tester.expect(code).toEmitDiagnostics({
    code: "@azure-tools/typespec-azure-resource-manager/unsupported-type",
    message: `Model type '${type}' is not supported in Azure resource manager APIs.`,
  });
}

describe("using int8 emit diagnostics", () => {
  it("as property type", async () => {
    await expectUnsupportedType("int8", "model Foo {prop: int8}");
  });

  it("as element of array property", async () => {
    await expectUnsupportedType("int8", "model Foo {prop: int8[]}");
  });

  it("as operation return type", async () => {
    await expectUnsupportedType("int8", `op test(): int8;`);
  });
});
