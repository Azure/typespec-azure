// Test: library-query-parameters
// Violation: disallowed query parameters inherited from a library model must be reported on the local operation.

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget properties")
model WidgetProperties {}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  listByResourceGroup is ArmResourceListByParent<
    Widget,
    Parameters = Azure.Core.StandardListQueryParameters
  >;
}
