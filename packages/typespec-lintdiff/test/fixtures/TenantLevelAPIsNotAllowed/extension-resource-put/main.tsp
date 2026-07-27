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

/** An extension-scoped configuration resource. */
model ExtensionConfig is ExtensionResource<ExtensionConfigProperties> {
  @key("configName")
  @segment("configurations")
  @doc("The name of the config")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

/** Extension config properties. */
model ExtensionConfigProperties {
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
interface ExtensionConfigs {
  get is ArmResourceRead<ExtensionConfig>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<ExtensionConfig>;
  delete is ArmResourceDeleteSync<ExtensionConfig>;
  list is ArmResourceListByParent<ExtensionConfig>;
}
