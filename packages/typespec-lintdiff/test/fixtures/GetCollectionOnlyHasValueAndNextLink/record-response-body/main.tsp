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

@armResourceOperations
interface WidgetMetadata {
  @route("/scope/providers/Microsoft.TestService/widgetMetadata")
  @doc("List widget metadata.")
  @extension("x-ms-examples", #{})
  @get
  listWidgetMetadata(
    ...Azure.ResourceManager.CommonTypes.ApiVersionParameter,
  ): Record<string> | ErrorResponse;
}
