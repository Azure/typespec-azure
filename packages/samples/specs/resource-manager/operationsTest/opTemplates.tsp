import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

namespace Microsoft.OperationsTest;

// Tracked resources
model TestTrackedResource2 is TrackedResource<TestTrackedProperties2> {
  @doc("The name of the Tracked resource.")
  @key("trackedResourceName")
  @segment("trackedResource2s")
  @path
  name: string;
}

@armResourceOperations(TestTrackedResource2)
interface Tracked2Operations {
  get is ArmResourceRead<TestTrackedResource2>;
  create is ArmResourceCreateOrReplaceSync<TestTrackedResource2>;
  update is ArmResourcePatchSync<TestTrackedResource2, TestTrackedProperties2>;
  delete is ArmResourceDeleteSync<TestTrackedResource2>;
  listByResourceGroup is ArmResourceListByParent<TestTrackedResource2>;
  listBySubscription is ArmListBySubscription<TestTrackedResource2>;
}

@doc("rp-specific properties for the resource with all envelope properties")
model TestTrackedProperties2 {
  @doc("The status of the last operation performed on this resource.")
  provisioningState: EnvelopeProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}

@parentResource(TestTrackedResource2)
model TestTrackedChild2 is ProxyResource<TrackedChildProperties2> {
  @doc("The name of the Tracked child.")
  @key("childName")
  @segment("children")
  @path
  name: string;
}

@doc("A child of a tracked resource")
model TrackedChildProperties2 {
  @doc("The flavor of the tracked child")
  flavor: string;

  ...DefaultProvisioningStateProperty;
}

@doc("Operations for the tracked child")
@armResourceOperations(TestTrackedChild2)
interface TrackedChildOperations2 {
  get is ArmResourceRead<TestTrackedChild2>;
  create is ArmResourceCreateOrReplaceSync<TestTrackedChild2>;
  update is ArmResourcePatchSync<TestTrackedChild2, TrackedChildProperties2>;
  delete is ArmResourceDeleteSync<TestTrackedChild2>;
  listByParent is ArmResourceListByParent<TestTrackedChild2>;
}

// Tenant resources

@tenantResource
model TestTenantResource2 is ProxyResource<TestTenantProperties2> {
  @doc("The name of the tenant resource.")
  @key("tenantResourceName")
  @segment("tenantResource2s")
  @path
  name: string;
}

@armResourceOperations(TestTenantResource2)
interface TenantOperations2 {
  get is ArmResourceRead<TestTenantResource2>;
  create is ArmResourceCreateOrReplaceSync<TestTenantResource2>;
  update is ArmResourcePatchSync<TestTenantResource2, TestTenantProperties2>;
  delete is ArmResourceDeleteSync<TestTenantResource2>;
  listByParent is ArmResourceListByParent<TestTenantResource2>;
}

@doc("rp-specific properties for the resource")
model TestTenantProperties2 {
  @visibility("read")
  @doc("The status of the last operation performed on this resource.")
  provisioningState?: EnvelopeProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}

@parentResource(TestTenantResource2)
model TestTenantChile2 is ProxyResource<TenantChildProperties2> {
  @doc("The name of the tenant child.")
  @key("childName")
  @segment("children")
  @path
  name: string;
}

@doc("A child of a tenant resource")
model TenantChildProperties2 {
  @doc("The flavor of the tenant child")
  flavor: string;

  ...DefaultProvisioningStateProperty;
}

@armResourceOperations(TestTenantChile2)
interface TenantChildOperations2 {
  get is ArmResourceRead<TestTenantChile2>;
  create is ArmResourceCreateOrReplaceSync<TestTenantChile2>;
  update is ArmResourcePatchSync<TestTenantChile2, TestTenantProperties2>;
  delete is ArmResourceDeleteSync<TestTenantChile2>;
  listByParent is ArmResourceListByParent<TestTenantChile2>;
}

// Extension resources

model TestExtensionResource2 is ExtensionResource<TestExtensionProperties2> {
  @doc("The name of the extension resource.")
  @key("extensionResourceName")
  @segment("extensionResource2s")
  @path
  name: string;
}

@armResourceOperations(TestExtensionResource2)
interface ExtensionOperations2 {
  get is ArmResourceRead<TestExtensionResource2>;
  create is ArmResourceCreateOrReplaceSync<TestExtensionResource2>;
  update is ArmResourcePatchSync<TestExtensionResource2, TestExtensionProperties2>;
  delete is ArmResourceDeleteSync<TestExtensionResource2>;
  listByParent is ArmResourceListByParent<TestExtensionResource2>;
}

@doc("rp-specific properties for the resource")
model TestExtensionProperties2 {
  @doc("The status of the last operation performed on this resource.")
  provisioningState: EnvelopeProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}

@parentResource(TestExtensionResource2)
model TestExtensionChild2 is ProxyResource<ExtensionChildProperties2> {
  @doc("The name of the extension child.")
  @key("childName")
  @segment("children")
  @path
  name: string;
}

@doc("A child of a tenant resource")
model ExtensionChildProperties2 {
  @doc("The flavor of the extension child")
  flavor: string;

  ...DefaultProvisioningStateProperty;
}

@armResourceOperations(TestExtensionChild2)
interface ExtensionChildOperations2 {
  get is ArmResourceRead<TestExtensionChild2>;
  create is ArmResourceCreateOrReplaceSync<TestExtensionChild2>;
  update is ArmResourcePatchSync<TestExtensionChild2, ExtensionChildProperties2>;
  delete is ArmResourceDeleteSync<TestExtensionChild2>;
  listByParent is ArmResourceListByParent<TestExtensionChild2>;
}

@locationResource
model LocationResource is ProxyResource<LocationProperties> {
  @key("locationResourceName")
  @segment("locationResources")
  @doc("The name of the location resource")
  @path
  name: string;
}

@doc("The rp-specific properties of a LocationResource")
model LocationProperties {
  ...DefaultProvisioningStateProperty;

  @doc("The color of the location")
  color: string;
}

@doc("The length of time a location resource is disabled")
model DisableLocationProperties {
  @doc("The start of the disabling")
  startTime: utcDateTime;

  @doc("The end time of disabling")
  endTime: utcDateTime;
}

@doc("A request to change a location resource in some unspecified manner")
model LocationMungeRequest {
  @doc("Data on the unspecified change")
  mungeData: string;
}

@doc("The result of an unspecified change")
model LocationMungeResult {
  @doc("Description fo the unspecified change")
  mungeResult: string;
}

@armResourceOperations(LocationResource)
interface LocationResourceOperations {
  get is ArmResourceRead<LocationResource>;
  create is ArmResourceCreateOrReplaceSync<LocationResource>;
  update is ArmResourcePatchSync<LocationResource, LocationProperties>;
  delete is ArmResourceDeleteSync<LocationResource>;
  listByParent is ArmResourceListByParent<LocationResource>;
  @doc("Disable a location for the given period")
  disable is ArmResourceActionNoContentSync<LocationResource, DisableLocationProperties>;
  @doc("Make an unspecified change at the given location")
  munge is ArmResourceActionSync<LocationResource, LocationMungeRequest, LocationMungeResult>;
}

@parentResource(LocationResource)
model LocationChild is ProxyResource<LocationProperties> {
  @key("childname")
  @segment("children")
  @doc("The name of the location resource")
  @path
  name: string;
}

@doc("The rp-specific properties of a LocationResource child")
model LocationChildProperties {
  ...DefaultProvisioningStateProperty;

  @doc("The color of the location")
  color: string;
}

@doc("The length of time a location resource child is enabled")
model EnableLocationChildProperties {
  @doc("The start of the disabling")
  startTime: utcDateTime;

  @doc("The end time of disabling")
  endTime: utcDateTime;
}

@doc("A request to change a location resource child in some unspecified manner")
model LocationMungeChildRequest {
  @doc("Data on the unspecified change")
  mungeData: string;
}

@doc("The result of an unspecified change")
model LocationMungeChildResult {
  @doc("Description fo the unspecified change")
  mungeResult: string;
}

@armResourceOperations(LocationChild)
interface LocationChildResourceOperations {
  get is ArmResourceRead<LocationChild>;
  create is ArmResourceCreateOrReplaceSync<LocationChild>;
  update is ArmResourcePatchSync<LocationChild, LocationProperties>;
  delete is ArmResourceDeleteSync<LocationChild>;
  listByParent is ArmResourceListByParent<LocationChild>;
  @doc("Enable a location for the given period")
  enable is ArmResourceActionNoContentAsync<LocationChild, EnableLocationChildProperties>;
  @doc("Make an unspecified change at the given location")
  munge is ArmResourceActionAsync<
    LocationChild,
    LocationMungeChildRequest,
    LocationMungeChildResult
  >;
}
