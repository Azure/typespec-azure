// Test: missing-pattern
// Violation: Path parameter keeps maxLength but omits pattern.

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
  @route("/widgets/{name}")
  @doc("Get a widget")
  @get op getWidget(
    @path @maxLength(50) @doc("Widget name") name: string,
    @query("api-version") @doc("API version") apiVersion: string,
  ): Widget;
}
