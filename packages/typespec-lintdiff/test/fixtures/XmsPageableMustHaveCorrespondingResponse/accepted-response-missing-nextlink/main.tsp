// Test: accepted-response-missing-nextlink
// Violation: ARM pageable response falls back to another 2xx response when 200 is absent.

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

model AcceptedWidgetList {
  @statusCode
  statusCode: 202;

  @body
  body: WidgetList;
}

@route("/widgets")
@doc("Patch widgets")
@extension("x-ms-pageable", #{ nextLinkName: "nextLink" })
@patch op patchWidgets(): AcceptedWidgetList;
