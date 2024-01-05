import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { resourceNameRule } from "../../src/rules/resource-name.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: resource name rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      resourceNameRule,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  describe("resource name filed should be marked with 'read' visibility and an @path decorator", () => {
    it("is valid if resource name has all decorators", async () => {
      await tester
        .expect(
          `
          @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
          @armProviderNamespace
          namespace Microsoft.Foo;
  
          model FooResource is TrackedResource<{}> {
            @doc("The name of the all properties resource.")
            @key("foo")
            @path
            @segment("foo")
            name: string;
          }
      `
        )
        .toBeValid();
    });

    it("emit diagnostic if @path is missing", async () => {
      await tester
        .expect(
          `
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          @key("foo")
          @segment("foo")
          name: string;
        }
        `
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-resource-manager/resource-name",
          message: `The resource 'name' field should be marked with 'read' visibility and an @path decorator.`,
        });
    });
  });

  describe("resource name must not use invalid char", () => {
    it("is valid", async () => {
      await tester.expect(`model FooProperties {}`).toBeValid();
    });

    it("emit warnings if resource use _", async () => {
      await tester
        .expect(
          `
        @armProviderNamespace
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.Foo;

        model Foo_Resource is TrackedResource<{}> {
          @key("foo") @segment("foo") @path
          name: string;
        }
        @armResourceOperations
        interface FooResources extends ResourceRead<Foo_Resource> {}
      `
        )
        .toEmitDiagnostics({
          code: "@azure-tools/typespec-azure-resource-manager/resource-name",
          message: "Arm resource name must contain only alphanumeric characters.",
        });
    });
  });
});
