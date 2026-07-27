// Test: non-pageable-extra-properties
// Compliance: collection response with extra properties stays outside upstream heuristic scope.

import "@typespec/http";
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

@doc("Non-pageable widget summary")
model WidgetSummary {
  @doc("Array of widgets")
  value: Widget[];

  @doc("Summary name")
  summary: string;

  @doc("Total count")
  count: int32;

  @doc("Category")
  category: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Raw operation for pagination rule coverage."
@route("/widgets/summary")
@doc("Get widget summary")
@get op getWidgetSummary(
  @query("api-version") @doc("API version") apiVersion: string,
): WidgetSummary;
