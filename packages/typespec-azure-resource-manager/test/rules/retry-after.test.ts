import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { retryAfterRule } from "../../src/rules/retry-after.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    retryAfterRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("is valid if there is an interface called Operations extending Azure.ResourceManager.Operations", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Foo;
        
        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }
        
        model UpdateFooResponse {
          @header("Retry-After") retryAfter: utcDateTime;
          ...FooResource;
        }
        
        @armResourceOperations
        interface FooResources {
          @armResourceUpdate(FooResource)
          @patch(#{implicitOptionality: true})
          update(): UpdateFooResponse;
        }
      `,
    )
    .toBeValid();
});

it("emit warnings for long running operation without retry after header in response", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Foo;
   
        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        @Azure.Core.lroStatus
        enum Status {
          Failed,
          Succeeded,
          Canceled,
        }
        @armResourceOperations
        interface FooResources {
          @Azure.Core.pollingOperation(FooResources.getOperationStatus)
          @post op update(): FooResource;

          op getOperationStatus(): {status: Status};
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/retry-after",
      message: `For long-running operations, the Retry-After header indicates how long the client should wait before polling the operation status, please add this header to the 201 or 202 response for this operation.`,
    });
});
