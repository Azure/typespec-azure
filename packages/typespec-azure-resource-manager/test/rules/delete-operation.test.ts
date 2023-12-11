import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { deleteOperationMissingRule } from "../../src/rules/delete-operation.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: delete operation missing rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      deleteOperationMissingRule,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  it("is valid if arm resource has a delete operation", async () => {
    await tester
      .expect(
        `
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          @key("foo") @segment("foo") @path
          name: string;
        }

        @armResourceOperations
        interface FooResources extends 
          ResourceUpdate<FooResource,{}>,
          ResourceRead<FooResource>,
          ResourceCreate<FooResource>,
          ResourceDelete<FooResource> {}
      `
      )
      .toBeValid();
  });

  it("emit warnings if TrackedResource is missing a delete operation", async () => {
    await tester
      .expect(
        `
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        @key("foo") @segment("foo") @path
        name: string;
      }

      @armResourceOperations
      interface FooResources extends 
        ResourceUpdate<FooResource,{}>,
        ResourceRead<FooResource>,
        ResourceCreate<FooResource> {}
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation",
        message: `The resource must have a delete operation.`,
      });
  });
});
