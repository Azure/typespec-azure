import "../shared.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations(#{ allowStaticRoutes: true })
interface WidgetScopeOps {
  @doc("Create or update a scope-prefixed widget resource")
  @extension("x-ms-examples", #{})
  @route("/{scope}/providers/Microsoft.TestService/widgets/{widgetName}")
  @put op putScopedWidget(
    @doc("The parent scope") @path scope: string,
    @doc("The widget name") @path widgetName: string,
    ...ApiVersionParameter,
    @doc("The request body") @bodyRoot body: WidgetConfigRequest,
  ): Widget | ErrorResponse;
}
