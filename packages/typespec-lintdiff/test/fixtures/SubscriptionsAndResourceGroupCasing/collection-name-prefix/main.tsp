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

@doc("Widget details.")
model Widget {
  @doc("The widget name.")
  name?: string;
}

interface Operations extends Azure.ResourceManager.Operations {
  @doc("Get subscription history.")
  @extension("x-ms-examples", #{})
  @route("/SubscriptionsHistory/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
  @get
  getWidget(
    ...CommonTypes.SubscriptionIdParameter,
    ...CommonTypes.ResourceGroupNameParameter,

    @doc("The history name.")
    @path
    @pattern("^[a-zA-Z0-9_-]+$")
    widgetName: string,

    ...ApiVersionParameter,
  ): Widget | ErrorResponse;
}
