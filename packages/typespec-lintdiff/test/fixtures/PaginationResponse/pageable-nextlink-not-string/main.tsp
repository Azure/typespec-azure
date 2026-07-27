// Test: pageable-nextlink-not-string
// Violation: x-ms-pageable response uses a non-string nextLink property.

import "@typespec/http";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget resource")
model Widget {
  @doc("Widget name")
  name: string;
}

@doc("Invalid pageable widget list")
model WidgetList {
  @doc("Array of widgets")
  value: Widget[];

  @doc("Incorrect next link")
  nextLink?: {};
}

#suppress "@azure-tools/typespec-azure-core/no-openapi" "Testing explicit x-ms-pageable behavior."
#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Raw operation for pagination rule coverage."
@route("/widgets")
@doc("Get widgets page")
@get
@extension("x-ms-pageable", #{ nextLinkName: "nextLink" })
op getWidgetsPage(
  @query("api-version") @doc("API version") apiVersion: string,
): WidgetList;
