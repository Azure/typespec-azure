import "../shared.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations(#{ allowStaticRoutes: true })
interface WidgetProviderRootOps {
  @doc("Create or update a provider root resource with no trailing type-name pair")
  @extension("x-ms-examples", #{})
  @route("/providers/Microsoft.TestService")
  @put op putProviderRoot(
    ...ApiVersionParameter,
    @doc("The request body") @bodyRoot body: WidgetConfigRequest,
  ): Widget | ErrorResponse;
}
