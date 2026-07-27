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

/** A subscription-level configuration resource. */
@subscriptionResource
model SubscriptionConfig is ProxyResource<SubscriptionConfigProperties> {
  @key("configName")
  @segment("configurations")
  @doc("The name of the config")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

/** Subscription config properties. */
model SubscriptionConfigProperties {
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
interface SubscriptionConfigs {
  get is ArmResourceRead<SubscriptionConfig, Foundations.SubscriptionBaseParameters>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<
    SubscriptionConfig,
    Foundations.SubscriptionBaseParameters
  >;
  delete is ArmResourceDeleteSync<SubscriptionConfig, Foundations.SubscriptionBaseParameters>;
  list is ArmResourceListByParent<SubscriptionConfig, Foundations.SubscriptionBaseParameters>;
}
