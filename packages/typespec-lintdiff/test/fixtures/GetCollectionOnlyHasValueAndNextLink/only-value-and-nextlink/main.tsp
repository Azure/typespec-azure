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

@doc("A widget part.")
model WidgetPart {
  @doc("The name of the widget part")
  name: string;
}

@doc("Valid collection response with only value and nextLink")
model WidgetPartListResult {
  @doc("List of widget parts")
  value: WidgetPart[];

  @doc("Next link")
  nextLink?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface WidgetParts {
  @route("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.TestService/widgets/exampleWidget/parts")
  @doc("List widget parts by widget.")
  @extension("x-ms-examples", #{})
  @get
  listWidgetParts(
    ...Azure.ResourceManager.CommonTypes.ApiVersionParameter,
  ): WidgetPartListResult | ErrorResponse;
}
