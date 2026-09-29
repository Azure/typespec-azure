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
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_01_01: "2024-01-01",
}

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

model WidgetProperties {
  description?: string;
}

model WidgetListResult {
  @pageItems
  items: Widget[];

  @nextLink
  nextLink?: string;
}

@armResourceOperations
interface Widgets {
  @list
  listCustom is ArmResourceActionSync<Widget, void, ArmResponse<WidgetListResult>>;
}
