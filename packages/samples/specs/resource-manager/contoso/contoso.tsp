import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service({
  title: "ContosoProviderHubClient",
})
@OpenAPI.info({
  version: "2021-10-01-preview",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@armCommonTypesVersion(CommonTypes.Versions.v5)
@doc("Contoso Resource Provider management API.")
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("A ContosoProviderHub resource")
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

@doc("The rp-specific properties of the employee")
model EmployeeProperties {
  @doc("The employee age in years")
  age?: int32;

  @doc("The city of current residence")
  city?: string;

  @doc("security profile for the employee")
  @encode("base64url")
  profile?: bytes;

  @visibility("read")
  @doc("The status of the last operation.")
  provisioningState?: ProvisioningState;
}

@armResourceOperations
interface Employees extends TrackedResourceOperations<Employee, EmployeeProperties> {}

@doc("The provisioning state of a resource.")
@Azure.Core.lroStatus
union ProvisioningState {
  string,
  ResourceProvisioningState,

  @doc("The resource is being provisioned")
  Provisioning: "Provisioning",

  @doc("The resource is updating")
  Updating: "Updating",

  @doc("The resource is being deleted")
  Deleting: "Deleting",

  @doc("The resource create request has been accepted")
  Accepted: "Accepted",
}
