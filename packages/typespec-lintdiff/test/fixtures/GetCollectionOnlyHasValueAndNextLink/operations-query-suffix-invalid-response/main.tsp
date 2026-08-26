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

@doc("Response shape that is invalid because the raw path no longer ends with operations.")
model WidgetValueOnlyResult {
  @doc("The widget values.")
  value: Widget[];
}

@armResourceOperations
interface CustomOperations {
  @route("/scope/providers/Microsoft.TestService/customoperations?disambiguation_dummy")
  @doc("Get custom operations.")
  @extension("x-ms-examples", #{})
  @get
  getCustomOperations(
    ...Azure.ResourceManager.CommonTypes.ApiVersionParameter,
  ): WidgetValueOnlyResult | ErrorResponse;
}
