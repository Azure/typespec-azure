// Test: null-nextlinkname
// Compliant: ARM pageable response allows nextLinkName to be null.

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

model Widget {
  @doc("Name")
  name: string;
}

model WidgetList {
  @doc("Array of widgets")
  value: Widget[];
}

@route("/widgets")
@doc("List widgets")
@extension("x-ms-pageable", #{ nextLinkName: null })
@get op listWidgets(): WidgetList;
