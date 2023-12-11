namespace Microsoft.DiscriminatorTest.Common;

using TypeSpec.Rest;

@discriminator("roleType")
@doc("The HR role of the employee")
model EmployeeRole {}

@doc("An individual contributor")
model IcRole extends EmployeeRole {
  @doc("The HR role of the employee")
  roleType: "IC";
}
