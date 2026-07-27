import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_01_01: "2024-01-01",
}

/** A private endpoint connection proxy resource. */
model PrivateEndpointConnectionProxy is TrackedResource<PrivateEndpointConnectionProxyProperties> {
  @key("proxyName")
  @segment("privateEndpointConnectionProxies")
  @doc("The name of the private endpoint connection proxy")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

/** Private endpoint connection proxy properties. */
model PrivateEndpointConnectionProxyProperties {
  /** Description of the proxy. */
  description?: string;

  /** The provisioning state of the proxy. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

/** The provisioning state of a resource. */
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface PrivateEndpointConnectionProxies {
  get is ArmResourceRead<PrivateEndpointConnectionProxy>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<PrivateEndpointConnectionProxy>;
  delete is ArmResourceDeleteWithoutOkAsync<PrivateEndpointConnectionProxy>;
  listByResourceGroup is ArmResourceListByParent<PrivateEndpointConnectionProxy>;
  listBySubscription is ArmListBySubscription<PrivateEndpointConnectionProxy>;
}
