import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
  extractCursor,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { requireKeyVisibility } from "../../src/rules/require-key-visibility.js";
import { createAzureCoreTestRunner, getRunnerPosOffset } from "../test-host.js";

describe("typespec-azure-core: key-visibility-required rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
    tester = createLinterRuleTester(
      runner,
      requireKeyVisibility,
      "@azure-tools/typespec-azure-core",
    );
  });

  async function checkKeyVisibility(code: string, message: string) {
    const { pos, source } = extractCursor(code);
    await tester.expect(source).toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/key-visibility-required",
        message,
        pos: getRunnerPosOffset(pos),
      },
    ]);
  }

  it("emits `key-visibility-required` when key property does not have visibility decorator", async () => {
    await checkKeyVisibility(
      `model Foo {
         ┆@key
         name: string;
        }`,
      "The key property 'name' does not have an explicit visibility setting, please use the @visibility decorator to set it.",
    );
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
});
