import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Azure.ResourceManager;

namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("A ContosoProviderHub resource")
model Employee is Azure.ResourceManager.Legacy.DiscriminatedTrackedResource<EmployeeType> {
  ...ResourceNameParameter<Employee>;
}

/** discriminator kind for Employee resources */
union EmployeeType {
  /** A Salaried employee */
  Salaried: "salaried",

  /** An Hourly Employee */
  Hourly: "hourly",

  string,
}

@doc("The rp-specific properties of the employee")
model SalariedEmployeeProperties {
  @doc("The employee age in years")
  age?: int32;

  @doc("The city of current residence")
  city?: string;

  @doc("security profile for the employee")
  @encode("base64url")
  profile?: bytes;

  /** monthly salary */
  salary?: float64;

  @visibility(Lifecycle.Read)
  @doc("The status of the last operation.")
  provisioningState?: ProvisioningState;
}

/** Hourly employee rp-specific properties */
model HourlyEmployeeProperties {
  @doc("The employee age in years")
  age?: int32;

  @doc("The city of current residence")
  city?: string;

  @doc("security profile for the employee")
  @encode("base64url")
  profile?: bytes;

  @doc("The hourly wage of the employee.")
  hourlyWage?: float64;

  @visibility(Lifecycle.Read)
  @doc("The status of the last operation.")
  provisioningState?: ProvisioningState;
}

/** Salaried employee */
model SalariedEmployee extends Employee {
  kind: EmployeeType.Salaried;
  properties: SalariedEmployeeProperties;
}

/** Hourly employee */
model HourlyEmployee extends Employee {
  kind: EmployeeType.Hourly;
  properties: HourlyEmployeeProperties;
}

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;
}

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
