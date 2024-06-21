import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint" "cuz"
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@useDependency(Azure.ResourceManager.CommonTypes.Versions.v3)
@armLibraryNamespace
namespace Microsoft.InterfacesTest;

// Tracked resources

/**
 * A Test Tracked Resource
 */
model TestTrackedResource is TrackedResource<TestTrackedProperties> {
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @doc("The name of the Tracked resource.")
  @key("trackedResourceName")
  @segment("trackedResources")
  @visibility("read")
  @path
  name: string;
}

/**
 * The operations for a Test Tracked Resource
 */
@armResourceOperations(TestTrackedResource)
interface TrackedOperations
  extends TrackedResourceOperations<TestTrackedResource, TestTrackedProperties> {}

@doc("rp-specific properties for the resource with all envelope properties")
model TestTrackedProperties {
  @doc("The status of the last operation performed on this resource.")
  @visibility("read")
  provisioningState?: ResourceProvisioningState;

  @visibility("create", "read")
  @doc("Name of the resource")
  displayName?: string = "default";
}

@parentResource(TestTrackedResource)
model TestTrackedChild is ProxyResource<TrackedChildProperties> {
  @pattern("^[a-zA-Z0-9-]{3,24}$")
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
  @pattern("^[a-zA-Z0-9-]{3,24}$")
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
  @visibility("read")
  provisioningState?: ResourceProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}

// Extension resources

model TestExtensionResource is ExtensionResource<TestExtensionProperties> {
  @pattern("^[a-zA-Z0-9-]{3,24}$")
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
  @visibility("read")
  provisioningState?: ResourceProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}
