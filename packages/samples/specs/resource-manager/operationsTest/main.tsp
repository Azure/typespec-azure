import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "./opTemplates.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@service({
  title: "Microsoft.OperationsTest",
  version: "2022-11-01-preview",
})
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@useDependency(Azure.Core.Versions.v1_0_Preview_1)
@armProviderNamespace
namespace Microsoft.OperationsTest;

interface Operations extends Azure.ResourceManager.Operations {}

@parentResource(TenantLocationResource)
model MyOpStatus is ArmOperationStatus;

@parentResource(SubscriptionLocationResource)
model MySubOpStatus is ArmOperationStatus;

interface OperationStatuses {
  getStatus is ArmResourceRead<MyOpStatus>;
  getSubscriptionStatus is ArmResourceRead<MySubOpStatus>;
}

// Tracked resources
model TestTrackedResource is TrackedResource<TestTrackedProperties> {
  @doc("The name of the Tracked resource.")
  @key("trackedResourceName")
  @segment("trackedResources")
  @path
  name: string;
}

@armResourceOperations(TestTrackedResource)
interface TrackedOperations
  extends TrackedResourceOperations<TestTrackedResource, TestTrackedProperties> {}

@doc("rp-specific properties for the resource with all envelope properties")
model TestTrackedProperties {
  @doc("The status of the last operation performed on this resource.")
  @visibility("read")
  provisioningState?: EnvelopeProvisioningState;

  @visibility("create", "read")
  @doc("Name of the resource")
  displayName?: string = "default";
}

@parentResource(TestTrackedResource)
model TestTrackedChild is ProxyResource<TrackedChildProperties> {
  @doc("The name of the Tracked child.")
  @key("childName")
  @segment("children")
  @path
  name: string;
}

@doc("A child of a tracked resource")
model TrackedChildProperties {
  @doc("The flavor of the tracked child")
  flavor: string;

  ...DefaultProvisioningStateProperty;
}

@doc("Operations for the tracked child")
@armResourceOperations(TestTrackedChild)
interface TrackedChildOperations extends ProxyResourceOperations<TestTrackedChild> {}

// Tenant resources

@tenantResource
model TestTenantResource is ProxyResource<TestTenantProperties> {
  @doc("The name of the tenant resource.")
  @key("tenantResourceName")
  @segment("tenantResources")
  @path
  name: string;
}

@armResourceOperations(TestTenantResource)
interface TenantOperations
  extends ProxyResourceOperations<TestTenantResource>,
    ResourceUpdate<TestTenantResource, TestTenantProperties> {}

@doc("rp-specific properties for the resource")
model TestTenantProperties {
  @doc("The status of the last operation performed on this resource.")
  provisioningState: EnvelopeProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}

@parentResource(TestTenantResource)
model TestTenantChile is ProxyResource<TenantChildProperties> {
  @doc("The name of the tenant child.")
  @key("childName")
  @segment("children")
  @path
  name: string;
}

@doc("A child of a tenant resource")
model TenantChildProperties {
  @doc("The flavor of the tenant child")
  flavor: string;

  ...DefaultProvisioningStateProperty;
}

@armResourceOperations(TestTenantChile)
interface TenantChildOperations extends ProxyResourceOperations<TestTenantChile> {}

// Extension resources

model TestExtensionResource is ExtensionResource<TestExtensionProperties> {
  @doc("The name of the extension resource.")
  @key("extensionResourceName")
  @segment("extensionResources")
  @path
  name: string;
}

@armResourceOperations(TestExtensionResource)
interface ExtensionOperations
  extends ProxyResourceOperations<TestExtensionResource>,
    ResourceUpdate<TestExtensionResource, TestExtensionProperties> {}

@doc("rp-specific properties for the resource")
model TestExtensionProperties {
  @doc("The status of the last operation performed on this resource.")
  provisioningState: EnvelopeProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}

@parentResource(TestExtensionResource)
model TestExtensionChild is ProxyResource<ExtensionChildProperties> {
  @doc("The name of the extension child.")
  @key("childName")
  @segment("children")
  @path
  name: string;
}

@doc("A child of a tenant resource")
model ExtensionChildProperties {
  @doc("The flavor of the extension child")
  flavor: string;

  ...DefaultProvisioningStateProperty;
}

@armResourceOperations(TestExtensionChild)
interface ExtensionChildOperations extends ProxyResourceOperations<TestExtensionChild> {}

// Common

@Azure.Core.lroStatus
@doc("The set of provisioning state values")
enum EnvelopeProvisioningState {
  ...ResourceProvisioningState,

  @doc("Working")
  Working,
}
