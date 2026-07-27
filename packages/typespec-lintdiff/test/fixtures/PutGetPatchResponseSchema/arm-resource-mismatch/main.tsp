import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  @doc("The name of the widget")
  name: string;
}

model WidgetAlternate is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  @doc("The name of the widget")
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

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;

  @doc("Create or update a widget")
  @put
  @armResourceCreateOrUpdate(Widget)
  createOrUpdate(
    ...ResourceInstanceParameters<Widget>,
    @doc("The request body") @bodyRoot body: Widget,
  ): ArmResponse<WidgetAlternate> | ErrorResponse;
}
