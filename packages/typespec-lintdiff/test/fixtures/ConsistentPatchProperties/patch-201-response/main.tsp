import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Display name")
  displayName?: string;
}

@doc("PATCH body with a property at the wrong level.")
model WidgetPatchBody {
  @doc("Display name at the top level instead of under properties")
  displayName?: string;
}

model CreatedWidgetResponse {
  @statusCode statusCode: 201;
  @body body: Widget;
}

interface Operations extends Azure.ResourceManager.Operations {}

interface CustomWidgetOperations {
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
  @patch
  update(...ResourceInstanceParameters<Widget>, @body body: WidgetPatchBody):
    | CreatedWidgetResponse
    | ErrorResponse;
}
