import "../../lib/imports.tsp";
using TypeSpec.Http; using TypeSpec.Rest; using TypeSpec.Versioning; using Azure.ResourceManager;

@armProviderNamespace @service(#{ title: "Test Service" }) @versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

@doc("Custom SKU with an extra unsupported property.")
model Sku {
  @doc("Name") name: string;
  @doc("Tier") tier?: string;
  @doc("Extra") extra?: string;
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName") @segment("widgets") @doc("The name of the widget") @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;

  #suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-envelope-property" "Testing custom sku model with unsupported property"
  @doc("The SKU") sku?: Sku;
}

@doc("Widget resource properties.")
model WidgetProperties {
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
}
