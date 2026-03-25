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

it("Should NOT emit diagnostic when @armResourceOperations is present with Operations interface", async () => {
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
