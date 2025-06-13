import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { armResourceKeyInvalidCharsRule } from "../../src/rules/arm-resource-key-invalid-chars.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: arm resource invalid chars in path rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armResourceKeyInvalidCharsRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
  });

  it("succeed when segment is not using any invalid chars", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<{}> {
          @visibility(Lifecycle.Read)
          @key("foo")
          @segment("foo")
          @path
          name: string;
        }
      `,
      )
      .toBeValid();
  });

  it("emit warning when using upper case letters in @key", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1) namespace MyService;

        model FooResource is TrackedResource<{}> {
          @visibility(Lifecycle.Read)
          @key("Foo")
          @segment("foo")
          @path
          name: string;
        }
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-key-invalid-chars",
        message: `'Foo' is an invalid path parameter name. Parameters must consist of alphanumeric characters starting with a lower case letter.`,
      });
  });
});
