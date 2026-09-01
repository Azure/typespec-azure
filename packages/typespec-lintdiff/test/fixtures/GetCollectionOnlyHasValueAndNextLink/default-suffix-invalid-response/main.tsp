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

interface Operations extends Azure.ResourceManager.Operations {}

@doc("A widget.")
model Widget {
  @doc("The widget name.")
  name: string;
}

@doc("Response shape that would be invalid if the route did not end with default.")
model WidgetValueOnlyResult {
  @doc("The widget values.")
  value: Widget[];
}

@armResourceOperations
interface CustomDefaults {
  @route("/scope/providers/Microsoft.TestService/customdefault")
  @doc("Get custom defaults.")
  @extension("x-ms-examples", #{})
  @get
  getCustomDefaults(...Azure.ResourceManager.CommonTypes.ApiVersionParameter):
    | WidgetValueOnlyResult
    | ErrorResponse;
}
