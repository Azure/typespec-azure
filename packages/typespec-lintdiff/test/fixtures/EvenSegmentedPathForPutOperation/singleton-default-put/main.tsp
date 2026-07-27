import "../shared.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations(#{ allowStaticRoutes: true })
interface WidgetSingletonOps {
  @doc("Create or update the default widget singleton")
  @extension("x-ms-examples", #{})
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/default")
  @put op putDefaultWidget(
    @doc("The subscription ID") @path subscriptionId: string,
    @doc("The resource group name") @path resourceGroupName: string,
    ...ApiVersionParameter,
    @doc("The request body") @bodyRoot body: WidgetConfigRequest,
  ): Widget | ErrorResponse;
}
