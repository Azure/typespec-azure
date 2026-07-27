// Test: client-name-same-as-param
// Violation: raw x-ms-client-name is set to the same value as the parameter name.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
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
  @doc("The widget name")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test fixture"
@route("/widgets/{name}")
interface Widgets {
  @doc("Get a widget")
  @get getWidget(
    @path @doc("Widget name") @extension("x-ms-client-name", "name") name: string,
    @query("api-version") @doc("API version") apiVersion: string,
  ): Widget;
}
