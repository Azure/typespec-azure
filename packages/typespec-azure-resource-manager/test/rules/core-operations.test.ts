import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { coreOperationsRule } from "../../src/rules/core-operations.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    coreOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("Detects operations outside interfaces", async () => {
  await tester
    .expect(
      `
          @armProviderNamespace
          namespace Microsoft.Foo;
    
          @route("/foo")
          @armResourceRead(FooResource)
          @get op getFoos(...ApiVersionParameter) : FooResource;
    
          model FooResource is TrackedResource<{}> {
            ...ResourceNameParameter<FooResource>;
          }
    
          @armResourceOperations
          interface FooResources
            extends TrackedResourceOperations<FooResource, {}> {
            }
        `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/use-interface",
      message: "All operations must be inside an interface declaration.",
    });
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
