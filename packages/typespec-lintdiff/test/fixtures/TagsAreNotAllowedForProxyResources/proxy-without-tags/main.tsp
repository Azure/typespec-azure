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
  v2024_01_01: "2024-01-01",
}

model Gadget is ProxyResource<GadgetProperties> {
  @key("gadgetName")
  @segment("gadgets")
  @path
  name: string;
}

model GadgetProperties {
  description?: string;
}

@armResourceOperations
interface Gadgets {
  get is ArmResourceRead<Gadget>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<Gadget>;
  delete is ArmResourceDeleteSync<Gadget>;
  listBySubscription is ArmListBySubscription<Gadget>;
}
