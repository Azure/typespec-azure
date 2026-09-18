import "../../lib/imports.tsp";

using TypeSpec.Http;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
namespace Microsoft.TestService {
  namespace Nested {
    model WidgetPatch {
      id?: string;
    }

    @route("/widgets/{widgetName}")
    @patch
    op update(@path widgetName: string, @body body: WidgetPatch): void;
  }
}
