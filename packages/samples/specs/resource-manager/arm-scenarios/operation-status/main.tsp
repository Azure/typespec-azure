import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@service({
  title: "Microsoft.OperationsTest",
})
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.OperationStatusSample;

enum Versions {
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  @armCommonTypesVersion("v5")
  `2022-11-01-preview`,
}

interface Operations extends Azure.ResourceManager.Operations {}

/** The standard operation status */
@parentResource(TenantLocationResource)
model MyOpStatus is ArmOperationStatus;

/** The standard operation status at the subscription level] */
@parentResource(SubscriptionLocationResource)
model MySubOpStatus is ArmOperationStatus;

@parentResource(ArmLocationResource<"ResourceGroup">)
model MyResourceGroupStatus is ArmOperationStatus;

interface OperationStatuses {
  getStatus is ArmResourceRead<MyOpStatus>;
  getSubscriptionStatus is ArmResourceRead<MySubOpStatus>;
  getRgStatus is ArmResourceRead<MyResourceGroupStatus>;
}
