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

@parentResource(Widget)
model WidgetPart is ProxyResource<WidgetPartProperties> {
  @key("partName") @segment("parts") @doc("The name of the part") @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget part resource properties.")
model WidgetPartProperties {
  @doc("Part description") description?: string;
  @doc("Resource provisioning state") @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
}

@armResourceOperations
interface WidgetParts {
  get is ArmResourceRead<WidgetPart>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<WidgetPart>;
  delete is ArmResourceDeleteSync<WidgetPart>;
  listByWidget is ArmResourceListByParent<WidgetPart>;
}
