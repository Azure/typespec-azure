import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armLegacyOperationsDiscourage } from "../../src/rules/arm-legacy-operations-discourage.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armLegacyOperationsDiscourage,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostic when using @Azure.ResourceManager.Legacy.LegacyOperations", async () => {
  await tester
    .expect(
      `
  @armProviderNamespace
  namespace Microsoft.ContosoProviderhub;

  using Azure.ResourceManager.Legacy;

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

  interface Operations extends Azure.ResourceManager.Operations {}

  @error
  model MyErrorType {
    code: string;

    message: string;
  }

  @armResourceOperations
  interface OtherOps
    extends Azure.ResourceManager.Legacy.LegacyOperations<
        ParentParameters = ParentScope,
        ResourceTypeParameter = InstanceScope,
        ErrorType = MyErrorType
      > {}

  alias BaseScope = {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Azure.ResourceManager.Legacy.Provider;
    ...LocationParameter;
  };

  alias InstanceScope = {
    @path
    @segment("employees")
    employeeName: string;
  };

  alias ParentScope = {
    ...BaseScope;
    ...ParentKeysOf<{
      @path
      @segment("employees")
      @key
      employeeName: string;
    }>;
  };
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-legacy-operations-discourage",
    });
});
