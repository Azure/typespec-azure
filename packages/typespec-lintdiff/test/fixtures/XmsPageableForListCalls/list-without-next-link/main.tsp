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

model WidgetPageWithoutNextLink {
  @pageItems
  value: Widget[];
}

interface Operations extends Azure.ResourceManager.Operations {}

interface Widgets {
  get is ArmResourceRead<Widget>;

  @route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgets")
  @get
  @list
  @armResourceList(Widget)
  list(@path subscriptionId: string, ...ApiVersionParameter):
    | ArmResponse<WidgetPageWithoutNextLink>
    | ErrorResponse;
}
