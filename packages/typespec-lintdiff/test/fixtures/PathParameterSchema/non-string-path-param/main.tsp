// Test: non-string-path-param
// Violation: Path parameter is typed as int32 and also lacks maxLength/pattern constraints.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget")
model Widget {
  @doc("Name")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Test fixture uses an ad hoc operation to isolate path parameter constraints."
@doc("Widget operations")
interface Widgets {
  @route("/widgets/{widgetId}")
  @doc("Get a widget")
  @get op getWidget(
    @path @doc("Widget identifier") widgetId: int32,
    @query("api-version") @doc("API version") apiVersion: string,
  ): Widget;
}
