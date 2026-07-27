// Test: list-without-pagination
// Violation: GET returning an object with a value array but no x-ms-pageable.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
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

  @doc("Widget color")
  color?: string;
}

@doc("List of widgets")
model WidgetList {
  @doc("Array of widgets")
  value: Widget[];
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Raw operation for pagination rule coverage."
@route("/widgets")
@doc("Get widgets page")
@get op getWidgetsPage(
  @query("api-version") @doc("API version") apiVersion: string,
): WidgetList;
