import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { retryAfterRule } from "../../src/rules/retry-after.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: retry-after rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      retryAfterRule,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  it("is valid if there is an interface called Operations extending Azure.ResourceManager.Operations", async () => {
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
  
        model UpdateFooResponse {
          @header("Retry-After") retryAfter: utcDateTime;
          ...FooResource;
        }

        @armResourceOperations
        interface FooResources {
          @armResourceUpdate(FooResource)
          @OpenAPI.extension("x-ms-long-running-operation", true)
          @patch 
          op update(): UpdateFooResponse;
        }
      `
      )
      .toBeValid();
  });

  it("emit warnings for long running operation without retry after header in response", async () => {
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
        interface FooResources {
          @armResourceUpdate(FooResource)
          @OpenAPI.extension("x-ms-long-running-operation", true)
          @patch 
          op update(): FooResource;
        }
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/retry-after",
        message: `For long-running operations, the Retry-After header indicates how long the client should wait before polling the operation status, please add this header to the 201 or 202 response for this operation.`,
      });
  });
});
