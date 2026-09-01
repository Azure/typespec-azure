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

@doc("An analytics item.")
model AnalyticsItem {
  @doc("The item name")
  name?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  @route("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.TestService/widgets/exampleWidget/analyticsItems")
  @doc("List analytics items.")
  @extension("x-ms-examples", #{})
  @get
  listAnalyticsItems(
    ...Azure.ResourceManager.CommonTypes.ApiVersionParameter,
  ): AnalyticsItem[] | ErrorResponse;
}
