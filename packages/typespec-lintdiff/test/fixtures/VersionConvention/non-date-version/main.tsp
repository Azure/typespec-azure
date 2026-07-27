// Test: non-date-version
// Violation: API version uses "v1" instead of YYYY-MM-DD date format.

import "@typespec/http";
import "@typespec/rest";
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
  v1: "v1",
}

@doc("A widget")
model Widget {
  @doc("Name")
  name: string;
}

@route("/widgets/{name}")
interface Widgets {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Raw operation to test version formatting."
  @doc("Get a widget")
  @get op getWidget(
    @path @doc("Widget name") name: string,
    @query("api-version") @doc("API version") apiVersion: string,
  ): Widget;
}
