import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;

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

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
#suppress "@azure-tools/typespec-azure-core/no-openapi" "test"
@route("/widgets/{name}")
@doc("Get a widget")
@operationId("Widgets_Get_ByName")
@get op getWidget(@path @doc("Widget name") name: string, @query("api-version") @doc("API version") apiVersion: string): Widget;
