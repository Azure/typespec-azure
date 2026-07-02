import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armResourceOperationMissingApiVersionRule } from "../../src/rules/arm-resource-operation-missing-api-version.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armResourceOperationMissingApiVersionRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("Detects missing api-version parameters", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Foo;
  
        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        model MyResourceCommonParameters<TResource extends {}> {
          ...SubscriptionIdParameter;
          ...ResourceGroupParameter;
          ...ProviderNamespace<TResource>;
        }
  
        model MyResourceInstanceParameters<TResource extends {}> {
          ...MyResourceCommonParameters<TResource>;
          ...KeysOf<TResource>;
        }
  
        @armResourceOperations
        #suppress "deprecated" "test"
        interface FooResources
          extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
            @armResourceAction(FooResource)
            @action @post myFooAction(...MyResourceInstanceParameters<FooResource>) : ArmResponse<FooResource> | ErrorResponse;
          }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-missing-api-version",
      message:
        "All Resource operations must use an api-version parameter. Please include Azure.ResourceManager.ApiVersionParameter in the operation parameter list using the spread (...ApiVersionParameter) operator, or using one of the common resource parameter models.",
    });
});

it("doesn't emit diagnostic for operations that include ApiVersionParameter", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        @armResourceOperations
        interface FooResources extends TrackedResourceOperations<FooResource, {}> {}
      `,
    )
    .toBeValid();
});

it("doesn't emit diagnostic for internal operations", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    namespace Microsoft.Foo;

    model VmSize {
      cpus: int32;
    }

    @armResourceOperations
    interface ProviderOperations {
      @get
      getVmsSizes is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
    }
    `,
    )
    .toBeValid();
});

it("doesn't emit diagnostic for operation templates", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.ContosoProviderHub;

      @armResourceOperations
      interface Employees {
        getData is ArmBodyProviderActionSync<string>;
      }

      op ArmBodyProviderActionSync<T>(t: T, ...Azure.ResourceManager.Foundations.DefaultBaseParameters<TenantActionScope>): void;
    `,
    )
    .toBeValid();
});
