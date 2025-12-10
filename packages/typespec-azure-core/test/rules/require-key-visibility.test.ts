import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { requireKeyVisibility } from "../../src/rules/require-key-visibility.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, requireKeyVisibility, "@azure-tools/typespec-azure-core");
});

it("emits `key-visibility-required` when key property does not have visibility decorator", async () => {
  await tester
    .expect(
      `model Foo {
         /*loc*/@key
         name: string;
      }`,
    )
    .toEmitDiagnostics((x) => ({
      code: "@azure-tools/typespec-azure-core/key-visibility-required",
      message:
        "The key property 'name' has default Lifecycle visibility, please use the @visibility decorator to change it.",
      pos: x.pos.loc.pos,
    }));
});

it("does not emit `key-visibility-required` when key property has visibility decorator", async () => {
  await tester
    .expect(
      `model Foo {
         @key
         @visibility(Lifecycle.Read)
         name: string;
        }`,
    )
    .toBeValid();
});
