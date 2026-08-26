// Test: mis-cased-filter
// Violation: query parameter names are case-sensitive, so $FILTER is not the allowed $filter parameter.

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
  @doc("The name of the widget")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

model WidgetProperties {
  @doc("Description of the widget")
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  listByResourceGroup is ArmResourceListByParent<
    Widget,
    Parameters = {
      @query("$FILTER") @doc("Mis-cased OData filter") filter?: string;
    }
  >;
}
