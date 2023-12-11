import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "./common.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;
using Microsoft.DiscriminatorTest.Common;

@armProviderNamespace
@service({
  title: "DiscriminatorTest",
  version: "2021-10-01-preview",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@doc("DiscriminatorTest Resource Provider management API.")
namespace Microsoft.DiscriminatorTest;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("A DiscriminatorTest resource")
model Employee is TrackedResource<EmployeeProperties> {
  @doc("The name of the employee")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @key("employeeName")
  @segment("employees")
  @path
  name: string;
}

@armResourceOperations
interface Employees extends TrackedResourceOperations<Employee, EmployeeProperties> {
  @doc("Increase employee compensation")
  @post
  @armResourceAction(Employee)
  giveRaise(...ResourceInstanceParameters<Employee>): ArmResponse<Employee> | ErrorResponse;
}

@doc("The rp-specific properties of the employee")
model EmployeeProperties {
  @doc("age in years")
  age?: int32;

  @doc("City of current residence")
  city?: string;

  @doc("The HR role of the employee")
  role: EmployeeRole;

  @doc("The HR compensation type of the employee")
  employeeType: EmployeeType;

  ...DefaultProvisioningStateProperty;
}

@discriminator("employeeType")
@doc("The employee HR compensationtype")
model EmployeeType {}

@doc("An employee paid hourly wage")
model HourlyEmployee extends EmployeeType {
  @doc("The HR compensation type of the employee")
  employeeType: "Hourly";

  @doc("hourly pay rate")
  hourlyRate: int32;
}

@doc("An employee paid a salary")
model SalariedEmployee extends EmployeeType {
  @doc("The HR compensation type of the employee")
  employeeType: "Salaried";

  @doc("Annual salary of the employee")
  annualPay: int32;
}

@doc("An executive employee")
model ExecutiveEmployee extends EmployeeType {
  @doc("The HR compensation type of the employee")
  employeeType: "Executive";

  @doc("The executive compensation for the employee")
  specialReward: int32;
}

@doc("A manager")
model ManagerRole extends EmployeeRole {
  @doc("The HR compensation type of the employee")
  roleType: "Manager";

  @doc("The size of the team managed")
  teamSize: int32;
}
