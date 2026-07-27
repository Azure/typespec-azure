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

interface Operations extends Azure.ResourceManager.Operations {}

/** A tenant-level configuration resource. */
@tenantResource
model TenantConfig is ProxyResource<TenantConfigProperties> {
  @key("configName")
  @segment("configurations")
  @doc("The name of the config")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

/** Tenant config properties. */
model TenantConfigProperties {
  /** Config name repeated from path. */
  configName?: string;

  /** Setting value. */
  setting?: string;

  /** The provisioning state. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

/** The provisioning state of a resource. */
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

@armResourceOperations
interface TenantConfigs {
  get is ArmResourceRead<TenantConfig, Foundations.TenantBaseParameters>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<
    TenantConfig,
    Foundations.TenantBaseParameters
  >;
  delete is ArmResourceDeleteSync<TenantConfig, Foundations.TenantBaseParameters>;
  list is ArmResourceListByParent<TenantConfig, Foundations.TenantBaseParameters>;
}
