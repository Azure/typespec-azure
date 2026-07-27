import "../shared.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations(#{ allowStaticRoutes: true })
interface WidgetNestedOps {
  @doc("Create or update a nested widget configuration resource")
  @extension("x-ms-examples", #{})
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}/configs/{configName}")
  @put op putNestedWidgetConfig(
    @doc("The subscription ID") @path subscriptionId: string,
    @doc("The resource group name") @path resourceGroupName: string,
    @doc("The widget name") @path widgetName: string,
    @doc("The nested config name") @path configName: string,
    ...ApiVersionParameter,
    @doc("The request body") @bodyRoot body: WidgetConfigRequest,
  ): Widget | ErrorResponse;
}
