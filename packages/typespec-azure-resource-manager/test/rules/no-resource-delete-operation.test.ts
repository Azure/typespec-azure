import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { deleteOperationMissingRule } from "../../src/rules/no-resource-delete-operation.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
  tester = createLinterRuleTester(
    runner,
    deleteOperationMissingRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("is valid if arm resource has a delete operation", async () => {
  await tester
    .expect(
      `
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armProviderNamespace
        namespace Microsoft.Foo;

        model Foo is TrackedResource<{}> {
          @key @path @segment("foos") name: string;
        }

        @armResourceOperations
        interface FooOperations  {
          createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
          delete is ArmResourceDeleteWithoutOkAsync<Foo>;
        }
      `,
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

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }

      @armResourceOperations
      interface FooOperations  {
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation",
      message: `Resource 'Foo' must have a delete operation.`,
    });
});

it("emit warnings if the delete operation is for another resource", async () => {
  await tester
    .expect(
      `
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      namespace Microsoft.Foo;

      model Foo is TrackedResource<{}> {
        @key @path @segment("foos") name: string;
      }
      model Bar is TrackedResource<{}> {
        @key @path @segment("bars") name: string;
      }

      @armResourceOperations
      interface FooOperations  {
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Foo>;
        delete is ArmResourceDeleteWithoutOkAsync<Bar>;
      }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/no-resource-delete-operation",
      message: `Resource 'Foo' must have a delete operation.`,
    });
});
