import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Versioning;
using Azure.Core;
using Azure.ResourceManager;

/** Contoso Resource Provider management API. */
#suppress "@azure-tools/typespec-azure-core/require-versioned"
#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint"
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.ContosoProviderHub;

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
@lroStatus
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

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator"
interface EmplOps
  extends Azure.ResourceManager.Legacy.RoutedOperations<
      BaseParams & {
        ...ParentKeysOf<Employee>,
      },
      {
        ...KeysOf<Employee>,
      },
      ErrorResponse,
      #{
        useStaticRoute: true,
        route: "/subscriptions/{subscriptionId}/providers/Microsoft.Overridden/employees",
      }
    > {}

alias BaseParams = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
};

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator"
interface EmplOps2
  extends Azure.ResourceManager.Legacy.RoutedOperations<
      BaseParams2 & {
        ...ParentKeysOf<Employee>,
      },
      {
        ...KeysOf<Employee>,
      },
      ErrorResponse,
      #{ useStaticRoute: true }
    > {}

alias BaseParams2 = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;
};

/** Subscription operations */
@armResourceOperations(#{ allowStaticRoutes: true })
interface EmployeeSubscriptions {
  get is EmplOps.Read<Employee>;
  create is EmplOps.CreateOrUpdateAsync<Employee>;
  update is EmplOps.CustomPatchSync<Employee>;
  @route("/subscriptions/{subscriptionId}/providers/Microsoft.OverriddenForDelete/employees")
  delete is EmplOps.DeleteSync<Employee, OverrideRouteOptions = #{ useStaticRoute: true }>;
  listBySubscription is EmplOps.List<Employee>;
  checkExistence is EmplOps.CheckExistence<Employee>;
  /** start the employee */
  @route("/subscriptions/{subscriptionId}/providers/Microsoft.Overridden/employees/{employeeName}/start")
  start is EmplOps.ActionSync<Employee, void, void>;
}

@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.OverriddenThrice/employees")
@armResourceOperations(#{ allowStaticRoutes: true })
interface EmployeeResourceGroups {
  get is EmplOps2.Read<Employee>;
  create is EmplOps2.CreateOrUpdateAsync<Employee>;
  update is EmplOps2.CustomPatchSync<Employee>;
  delete is EmplOps2.DeleteSync<Employee, OverrideRouteOptions = #{ useStaticRoute: true }>;
  listByResourceGroup is EmplOps2.List<Employee>;
  checkExistence is EmplOps2.CheckExistence<Employee>;
  /** start the employee */
  @route("{employeeName}/startAgain")
  startAgain is EmplOps2.ActionSync<Employee, void, void>;
}
