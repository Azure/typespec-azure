import "../../lib/imports.tsp";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ClientGenerator.Core;
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
  @doc("Display name at the top level")
  displayName?: string;
}

model WidgetResponse {
  @statusCode statusCode: 200;
  @body body: Widget;
}

model AcceptedResponse {
  @statusCode statusCode: 202;
}

interface Operations extends Azure.ResourceManager.Operations {}

@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
interface CustomWidgetOperations {
  @get
  @scope("csharp")
  read(...ResourceInstanceParameters<Widget>): WidgetResponse | ErrorResponse;

  @patch
  update(...ResourceInstanceParameters<Widget>, @body body: WidgetPatchBody):
    | AcceptedResponse
    | ErrorResponse;
}
