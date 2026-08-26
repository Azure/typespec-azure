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
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
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
  @maxLength(24)
  name: string;
}

/** Tenant config properties. */
model TenantConfigProperties {
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

/** Refresh a tenant-level configuration. */
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw operation needed to test a custom tenant-level PUT."
@route("/providers/Microsoft.TestService/configurations/{configName}/refresh")
@put
op refreshTenantConfig(
  @doc("The name of the config")
  @path
  configName: string,

  ...ApiVersionParameter,

  @doc("The updated settings")
  @body
  body: TenantConfigProperties,
): TenantConfig | ErrorResponse;
