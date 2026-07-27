// Test: pageable-without-200
// Violation: x-ms-pageable operation with no 200 response.

import "@typespec/http";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget")
model Widget {
  @doc("Widget name")
  name: string;
}

@doc("Widget list")
model WidgetList {
  @doc("Values")
  value: Widget[];

  @doc("Next link")
  nextLink?: string;
}

model AcceptedList {
  @statusCode statusCode: 202;
  @body body: WidgetList;
}

@route("/widgets")
@doc("Patch widgets")
@extension("x-ms-pageable", #{ nextLinkName: "nextLink" })
@patch op patchWidgets(): AcceptedList;
