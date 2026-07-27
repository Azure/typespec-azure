// Test: post-without-pagination
// Violation: POST returning an object with a value array but no x-ms-pageable.

import "@typespec/http";
import "@typespec/rest";
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
}

@doc("Widget search results")
model WidgetList {
  @doc("Array of widgets")
  value: Widget[];
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Raw operation for pagination rule coverage."
@route("/widgets/search")
@doc("Search widgets")
@post op searchWidgets(
  @query("api-version") @doc("API version") apiVersion: string,
): WidgetList;
