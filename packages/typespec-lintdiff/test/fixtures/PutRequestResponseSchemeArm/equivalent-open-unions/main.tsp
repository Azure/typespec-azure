import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

@doc("Widget state.")
union RequestState {
  string,

  @doc("The widget is active.")
  active: "active",

  @doc("The widget is inactive.")
  inactive: "inactive",
}

@doc("Widget state.")
union ResponseState {
  string,

  @doc("The widget is active.")
  active: "active",

  @doc("The widget is inactive.")
  inactive: "inactive",
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

model WidgetRequest is TrackedResource<WidgetRequestProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget properties.")
model WidgetProperties {
  @doc("The widget state.")
  state?: ResponseState;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("Widget properties.")
model WidgetRequestProperties {
  @doc("The widget state.")
  state?: RequestState;

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
    @doc("The request body") @bodyRoot body: WidgetRequest,
  ): ArmResponse<Widget> | ArmCreatedResponse<Widget> | ErrorResponse;

  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
