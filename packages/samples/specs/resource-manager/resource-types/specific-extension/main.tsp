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

/** Virtual resource for a virtual machine */
alias VirtualMachine = Extension.ExternalResource<
  "Microsoft.Compute",
  "virtualMachines",
  "vmName",
  NamePattern = "^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$",
  Description = "The name of the virtual machine"
>;

alias Scaleset = Extension.ExternalResource<
  "Microsoft.Compute",
  "virtualMachineScaleSets",
  "scaleSetName",
  NamePattern = "^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$",
  Description = "The name of the virtual machine scale set"
>;

alias VirtualMachineScaleSetVm = Extension.ExternalChildResource<
  Scaleset,
  "virtualMachineScaleSetVms",
  "scaleSetVmName",
  NamePattern = "^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$",
  Description = "The name of the virtual machine scale set VM"
>;

@armResourceOperations
interface Employees extends EmplOps<Extension.ScopeParameter> {}
@armResourceOperations
interface Tenants extends EmplOps<Extension.Tenant> {}
@armResourceOperations
interface Subscriptions extends EmplOps<Extension.Subscription> {}
@armResourceOperations
interface ResourceGroups extends EmplOps<Extension.ResourceGroup> {}
@armResourceOperations
interface ManagementGroups extends EmplOps<Extension.ManagementGroup> {}

@armResourceOperations
interface VirtualMachines extends EmplOps<VirtualMachine> {}

@armResourceOperations
interface ScaleSetVms extends EmplOps<VirtualMachineScaleSetVm> {}

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

alias GenericResourceParameters = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;

  /** the provider namespace */
  @path
  @segment("providers")
  @key
  providerNamespace: string;

  /** the resource type of the parent */
  @path @key parentType: string;

  /** the name of the parent resource */
  @path @key parentName: string;

  /** the resource type of the target resource */
  @path @key resourceType: string;

  /** the name of the target resource */
  @path @key resourceName: string;
};

alias ParentParameters = {
  ...Extension.ExtensionProviderNamespace<Employee>;
  ...ParentKeysOf<Employee>;
};

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator"
interface GenericOps
  extends Azure.ResourceManager.Legacy.ExtensionOperations<
      GenericResourceParameters,
      ParentParameters,
      {
        ...Extension.ExtensionProviderNamespace<Employee>,
        ...KeysOf<Employee>,
      }
    > {}

@armResourceOperations
interface GenericResources {
  get is GenericOps.Read<Employee>;
  create is GenericOps.CreateOrUpdateAsync<Employee>;
  update is GenericOps.CustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is GenericOps.DeleteWithoutOkAsync<Employee>;
  list is GenericOps.List<Employee>;
}
