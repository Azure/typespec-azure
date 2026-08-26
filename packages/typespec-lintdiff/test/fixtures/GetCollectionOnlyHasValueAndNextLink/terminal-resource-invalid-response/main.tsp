import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
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

@doc("A widget.")
model Widget {
  @doc("The name of the widget")
  name: string;
}

@doc("Response shape that would be invalid for a collection GET.")
model WidgetValueOnlyResult {
  @doc("List of widgets")
  value: Widget[];
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  @route("/scope/providers/Microsoft.TestService/widgets/exampleWidget")
  @doc("Get a widget by name.")
  @extension("x-ms-examples", #{})
  @get
  getWidget(
    ...Azure.ResourceManager.CommonTypes.ApiVersionParameter,
  ): WidgetValueOnlyResult | ErrorResponse;
}
