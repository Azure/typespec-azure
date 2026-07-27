import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;
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

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description")
  description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("Valid pageable collection result with custom next link property.")
model WidgetListResult {
  @doc("List of widgets")
  value: Widget[];

  @doc("Next page link")
  nextPage?: string;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @doc("List widgets by resource group")
  @get
  @armResourceList(Widget)
  @operationId("Widgets_List3")
  @extension("x-ms-pageable", #{ nextLinkName: "nextPage" })
  listByResourceGroup(
    ...ResourceParentParameters<Widget>,
  ): ArmResponse<WidgetListResult> | ErrorResponse;
}
