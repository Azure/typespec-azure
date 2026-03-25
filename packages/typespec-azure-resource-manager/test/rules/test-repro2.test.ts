import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it, describe } from "vitest";

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

it("Full ARM sample should NOT emit diagnostic", async () => {
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
        @encode("base64url")
        profile?: bytes;
        @visibility(Lifecycle.Read)
        provisioningState?: ProvisioningState;
      }

      @lroStatus
      union ProvisioningState {
        string,
        Accepted: "Accepted",
        Provisioning: "Provisioning",
        Updating: "Updating",
        Succeeded: "Succeeded",
        Failed: "Failed",
        Canceled: "Canceled",
        Deleting: "Deleting",
      }

      model EmployeeUpdate {
        ...Azure.ResourceManager.Foundations.ArmTagsProperty;
        properties?: EmployeeUpdateProperties;
      }

      model EmployeeUpdateProperties {
        age?: int32;
        city?: string;
        @encode("base64url")
        profile?: bytes;
      }

      model MoveRequest {
        from: string;
        to: string;
      }

      model MoveResponse {
        movingStatus: string;
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
        update is ArmCustomPatchSync<Employee, EmployeeUpdate>;
        delete is ArmResourceDeleteWithoutOkAsync<Employee>;
        listByResourceGroup is ArmResourceListByParent<Employee>;
        listBySubscription is ArmListBySubscription<Employee>;
        move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;
        checkExistence is ArmResourceCheckExistence<Employee>;
      }
    `,
    )
    .toBeValid();
});
