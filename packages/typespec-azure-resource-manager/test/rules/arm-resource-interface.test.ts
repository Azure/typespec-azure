import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { interfacesRule } from "../../src/rules/arm-resource-interfaces.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    interfacesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("Detects interfaces without @armResourceOperations", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<FooProperties> {
        @visibility(Lifecycle.Read)
        @key("foo")
        @segment("foo")
        @path
        name: string;
        ...ManagedServiceIdentityProperty;
      }

      interface FooResources extends TrackedResourceOperations<FooResource, FooProperties> {}

      enum ResourceState {
        Succeeded,
        Canceled,
        Failed
      }

      model FooProperties {
        displayName?: string = "default";
        provisioningState: ResourceState;
      }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator",
      message: "Each resource interface must have an @armResourceOperations decorator.",
    });
});

it("Does not emit diagnostic when @armResourceOperations is present", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service(#{ title: "ContosoProviderHubClient" })
      @versioned(Versions)
      namespace Microsoft.ContosoProviderHub;

      enum Versions {
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        \`2021-10-01-preview\`,
      }

      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }

      model EmployeeProperties {
        age?: int32;
        city?: string;
        @visibility(Lifecycle.Read)
        provisioningState?: Azure.ResourceManager.ResourceProvisioningState;
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
        delete is ArmResourceDeleteWithoutOkAsync<Employee>;
        listByResourceGroup is ArmResourceListByParent<Employee>;
        listBySubscription is ArmListBySubscription<Employee>;
      }
    `,
    )
    .toBeValid();
});
