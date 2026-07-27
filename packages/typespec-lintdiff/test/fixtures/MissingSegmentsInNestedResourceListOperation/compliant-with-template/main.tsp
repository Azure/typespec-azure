import "../../lib/imports.tsp";
using TypeSpec.Http; using TypeSpec.Rest; using TypeSpec.Versioning; using Azure.ResourceManager;

@armProviderNamespace @service(#{ title: "Test Service" }) @versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName") @segment("widgets") @doc("The name of the widget") @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description") description?: string;
  @doc("Resource provisioning state") @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model Gadget is TrackedResource<GadgetProperties> {
  @key("gadgetName") @segment("gadgets") @doc("The name of the gadget") @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Gadget resource properties.")
model GadgetProperties {
  @doc("Description") description?: string;
  @doc("Resource provisioning state") @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@parentResource(Gadget)
model GadgetPart is ProxyResource<GadgetPartProperties> {
  @key("partName") @segment("parts") @doc("The name of the part") @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Gadget part resource properties.")
model GadgetPartProperties {
  @doc("Description") description?: string;
  @doc("Resource provisioning state") @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
}

@armResourceOperations
interface Gadgets {
  get is ArmResourceRead<Gadget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Gadget>;
  delete is ArmResourceDeleteWithoutOkAsync<Gadget>;
  listByResourceGroup is ArmResourceListByParent<Gadget>;
}

@armResourceOperations
interface GadgetParts {
  get is ArmResourceRead<GadgetPart>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<GadgetPart>;
  delete is ArmResourceDeleteSync<GadgetPart>;
  list is ArmResourceListByParent<GadgetPart>;
}
