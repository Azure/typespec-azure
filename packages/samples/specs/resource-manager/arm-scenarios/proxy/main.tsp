import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.ResourceManager;

/** Contoso Resource Provider management API. */
@armProviderNamespace
@service({
  title: "ContosoProviderHubClient",
})
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2021-10-01-preview`,
}

// For more information about the proxy vs tracked,
// see https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html?q=proxy%20resource
/** A ContosoProviderHub resource */
model Employee is TrackedResource<EmployeeProperties> {
  /** Name of employee */
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @key("employeeName")
  @path
  @segment("employees")
  @visibility("read")
  name: string;
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
  @visibility("read")
  provisioningState?: ProvisioningState;
}

/** The provisioning state of a resource. */
@lroStatus
union ProvisioningState {
  ResourceProvisioningState,

  /** The resource is being provisioned */
  Provisioning: "Provisioning",

  /** The resource is updating */
  Updating: "Updating",

  /** The resource is being deleted */
  Deleting: "Deleting",

  /** The resource create request has been accepted */
  Accepted: "Accepted",

  /** modelAsString=true */
  string,
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  update is ArmResourcePatchSync<Employee, EmployeeProperties>;
  delete is ArmResourceDeleteSync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;
  /** A sample resource action that move employee to different location */
  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;

  /** A sample HEAD operation to check resource existence */
  checkExistence is ArmResourceCheckExistence<Employee>;
}

/** Employee move request */
model MoveRequest {
  /** The moving from location */
  from: string;

  /** The moving to location */
  to: string;
}

/** Employee move response */
model MoveResponse {
  /** The status of the move */
  movingStatus: string;
}

@armResourceOperations
interface Dependents {
  get is ArmResourceRead<Dependent>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Dependent>;
  update is ArmResourcePatchSync<Dependent, DependentProperties>;
  delete is ArmResourceDeleteSync<Dependent>;
  list is ArmResourceListByParent<Dependent>;
}

@parentResource(Employee)
model Dependent is ProxyResource<DependentProperties> {
  /** Name of dependent */
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @key("dependentName")
  @path
  @segment("dependents")
  @visibility("read")
  name: string;
}

/** Dependent properties */
model DependentProperties {
  /** Age of dependent */
  age: int32;

  /** Gender of dependent */
  gender: string;
}
