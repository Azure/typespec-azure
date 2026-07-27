import "../shared.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations(#{ allowStaticRoutes: true })
interface WidgetCollectionOps {
  @doc("Create or update a widget collection endpoint without a resource name")
  @extension("x-ms-examples", #{})
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets")
  @put op putWidgetCollection(
    @doc("The subscription ID") @path subscriptionId: string,
    @doc("The resource group name") @path resourceGroupName: string,
    ...ApiVersionParameter,
    @doc("The request body") @bodyRoot body: WidgetConfigRequest,
  ): Widget | ErrorResponse;
}
