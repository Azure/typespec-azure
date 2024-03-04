// https://cadlplayground.z22.web.core.windows.net/cadl-azure/
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;
using Azure.Core;

@armProviderNamespace("Microsoft.UpdateTests")
@service({
  title: "Microsoft.UpdateTests",
})
@OpenAPI.info({
  version: "2023-03-01-preview",
})
@doc("Testing resource update using a Management API")
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.UpdateTests;

interface Operations extends Azure.ResourceManager.Operations {}

@Azure.Core.lroStatus
@doc("Provisioning state")
enum ProvisioningState {
  ...ResourceProvisioningState,

  @doc("Provisioning")
  Provisioning,

  @doc("Updating")
  Updating,

  @doc("Deleting")
  Deleting,

  @doc("Accepted")
  Accepted,
}

@doc("Access Point Gateway")
model TestUpdateResource is TrackedResource<TestUpdateResourceProperties> {
  @doc("The name of the Gateway")
  @key("accessPointGatewayName")
  @segment("accessPointGateways")
  @path
  name: string;
}

@doc("Access Point Gateway Site")
@parentResource(TestUpdateResource)
model TestUpdateChildResource is TrackedResource<TestUpdateChildProperties> {
  @doc("The name of the Gateway Site")
  @key("siteName")
  @segment("sites")
  @path
  name: string;
}

@doc("Access Point Gateway Subnet")
@parentResource(TestUpdateChildResource)
model TestCustomUpdateResource is TrackedResource<TestCustomUpdateProperties> {
  @doc("The name of the Gateway Subnet")
  @key("subnetName")
  @segment("subnets")
  @path
  name: string;
}

@doc("Cluster Classification Levels")
enum ClassificationLevel {
  @doc("Collateral")
  Collateral,

  @doc("SAR")
  Sar,

  @doc("SCI")
  Sci,

  @doc("SCI/SAR")
  SciSar,
}

@doc("Access Point Gateway Properties.")
model TestUpdateResourceProperties {
  @doc("The Classification Level of the Access Point infrastructure.")
  @visibility("create", "read")
  classificationLevel: ClassificationLevel;

  @doc("The status of the last operation.")
  @visibility("read")
  provisioningState?: ProvisioningState;
}

@doc("Gateway Site Properties.")
model TestUpdateChildProperties {
  @doc("The status of the last operation.")
  @visibility("read")
  provisioningState?: ProvisioningState;
}

@doc("Gateway Subnet Properties.")
model TestCustomUpdateProperties {
  @doc("The IP Range of the subnet")
  @visibility("read", "update")
  addressPrefix?: string;

  @doc("The size of the subnet you wish to create")
  @visibility("create", "update")
  subnetMask?: string;

  @doc("The status of the last operation.")
  @visibility("read")
  provisioningState?: ProvisioningState;
}

@doc("The update request body for custom update")
model CustomUpdateRequest {
  @doc("The first update property")
  properties?: CustomUpdateProperties;

  ...Azure.ResourceManager.Foundations.ArmTagsProperty;
}

@doc("Custom update request properties")
model CustomUpdateProperties {
  @doc("The IP Range of the subnet")
  addressPrefix?: string;

  @doc("The size of the subnet you wish to create")
  subnetMask?: string;
}

@armResourceOperations
interface TestUpdate {
  get is ArmResourceRead<TestUpdateResource>;
  create is ArmResourceCreateOrUpdateAsync<TestUpdateResource>;
  update is ArmTagsPatchSync<TestUpdateResource>;
  delete is ArmResourceDeleteWithoutOkAsync<TestUpdateResource>;
  listByResourceGroup is ArmResourceListByParent<TestUpdateResource>;
  listBySubscription is ArmListBySubscription<TestUpdateResource>;
}

@armResourceOperations
interface TestChildUpdate {
  get is ArmResourceRead<TestUpdateChildResource>;
  create is ArmResourceCreateOrUpdateAsync<TestUpdateChildResource>;
  update is ArmTagsPatchSync<TestUpdateChildResource>;
  delete is ArmResourceDeleteWithoutOkAsync<TestUpdateChildResource>;
  listByResourceGroup is ArmResourceListByParent<TestUpdateChildResource>;
  listBySubscription is ArmListBySubscription<TestUpdateChildResource>;
}

@armResourceOperations
interface TestCustomUpdate {
  get is ArmResourceRead<TestCustomUpdateResource>;
  create is ArmResourceCreateOrUpdateAsync<TestCustomUpdateResource>;
  update is ArmCustomPatchAsync<TestCustomUpdateResource, CustomUpdateRequest>;
  delete is ArmResourceDeleteWithoutOkAsync<TestCustomUpdateResource>;
  listByResourceGroup is ArmResourceListByParent<TestCustomUpdateResource>;
  listBySubscription is ArmListBySubscription<TestCustomUpdateResource>;
}
