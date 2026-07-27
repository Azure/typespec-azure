// Test: valid-pageable-response
// Compliant: ARM pageable response declares the referenced nextLink property.

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

  @doc("Next link")
  nextLink?: string;
}

@route("/widgets")
@doc("List widgets")
@extension("x-ms-pageable", #{ nextLinkName: "nextLink" })
@get op listWidgets(): WidgetList;
