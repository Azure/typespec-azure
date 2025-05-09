import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { armLegacyOperationsDiscourage } from "../../src/rules/arm-legacy-operations-discourage.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureResourceManagerTestRunner();
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
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.ContosoProviderhub;

        using Azure.ResourceManager.Legacy;

        /** A ContosoProviderHub resource */
  model Employee is TrackedResource<EmployeeProperties> {
    ...ResourceNameParameter<Employee>;
  }

  /** Employee properties */
  model EmployeeProperties {
    /** Age of employee */
    age?: int32;

    /** City of employee */
    city?: string;

    /** Profile of employee */
    @encode("base64url")
    profile?: bytes;

    /** The status of the last operation. */
    @visibility(Lifecycle.Read)
    provisioningState?: ProvisioningState;
  }

  /** The provisioning state of a resource. */
  union ProvisioningState {
    string,

    /** The resource create request has been accepted */
    Accepted: "Accepted",

    /** The resource is being provisioned */
    Provisioning: "Provisioning",

    /** The resource is updating */
    Updating: "Updating",

    /** Resource has been created. */
    Succeeded: "Succeeded",

    /** Resource creation failed. */
    Failed: "Failed",

    /** Resource creation was canceled. */
    Canceled: "Canceled",

    /** The resource is being deleted */
    Deleting: "Deleting",
  }

  interface Operations extends Azure.ResourceManager.Operations {}

  /** A custom error type */
  @error
  model MyErrorType {
    /** error code */
    code: string;

    /** error message */
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

  /** Experiments with scope */
  alias InstanceScope = {
    @doc("The employee name")
    @path
    @segment("employees")
    employeeName: string;
  };

  /** The parent scope */
  alias ParentScope = {
    ...BaseScope;
    ...ParentKeysOf<{
      @doc("The employee name")
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
