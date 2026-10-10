import "../resource.tsp";

using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations
interface WidgetActions {
  @doc("Reset a widget.")
  reset is ArmResourceActionSync<Widget, void, Response = ArmNoContentResponse>;
}
