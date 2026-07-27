import "../shared.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations(#{ allowStaticRoutes: true })
interface WidgetCustomOps {
  @doc("Set widget config at an odd-segmented path")
  @extension("x-ms-examples", #{})
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}/config")
  @put op setWidgetConfig(
    @doc("The subscription ID") @path subscriptionId: string,
    @doc("The resource group name") @path resourceGroupName: string,
    @doc("The widget name") @path widgetName: string,
    ...ApiVersionParameter,
    @doc("The request body") @bodyRoot body: WidgetConfigRequest,
  ): Widget | ErrorResponse;
}
