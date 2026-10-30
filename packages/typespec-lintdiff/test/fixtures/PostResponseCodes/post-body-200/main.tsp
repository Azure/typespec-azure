import "../resource.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations
interface WidgetActions {
  @doc("Reset a widget.")
  reset is ArmResourceActionSync<
    Widget,
    void,
    Response = {
      @statusCode _: 200;
      @body result: string;
    }
  >;
}
