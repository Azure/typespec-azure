import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

model WidgetProperties {
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

namespace Inventory {
  model WidgetSummary {
    count: int32;
  }

  interface Widgets {
    @route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgetSummaries")
    @get
    @armResourceList(Widget)
    listSummaries(@path subscriptionId: string, ...ApiVersionParameter):
      | ArmResponse<WidgetSummary>
      | ErrorResponse;
  }
}
