import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.Core;
using Azure.ResourceManager;

/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2021-10-01-preview`,
}

/** A ContosoProviderHub resource */
model Employee is ExtensionResource<EmployeeProperties> {
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
  ResourceProvisioningState,

  /** The resource is being provisioned */
  Provisioning: "Provisioning",

  /** The resource is updating */
  Updating: "Updating",

  /** The resource is being deleted */
  Deleting: "Deleting",

  /** The resource create request has been accepted */
  Accepted: "Accepted",

  string,
}

interface Operations extends Azure.ResourceManager.Operations {}

interface EmplOps<Scope extends Azure.ResourceManager.Foundations.SimpleResource> {
  get is Extension.Read<Scope, Employee>;
  #suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response" ""
  create is Extension.CreateOrReplaceAsync<Scope, Employee>;
  update is Extension.CustomPatchSync<
    Scope,
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is Extension.DeleteWithoutOkAsync<Scope, Employee>;
  list is Extension.ListByTarget<Scope, Employee>;
  move is Extension.ActionSync<Scope, Employee, MoveRequest, MoveResponse>;
}

model Mg is Extension.ManagementGroup;
@armResourceOperations
interface Employees extends EmplOps<Extension.ScopeParameter> {}
@armResourceOperations
interface Tenants extends EmplOps<Extension.Tenant> {}
@armResourceOperations
interface Subscriptions extends EmplOps<Extension.Subscription> {}
@armResourceOperations
interface ResourceGroups extends EmplOps<Extension.ResourceGroup> {}
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response" ""
@armResourceOperations
interface ManagementGroups extends EmplOps<Mg> {}

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
