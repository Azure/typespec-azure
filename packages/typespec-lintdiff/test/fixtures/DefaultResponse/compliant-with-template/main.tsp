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

@doc("A widget")
model Widget {
  @doc("Name")
  name: string;
}

@doc("Standard error")
@error
model Error {
  @doc("Error code")
  code: string;
  @doc("Error message")
  message: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@route("/widgets/{name}")
@doc("Get a widget")
@get op getWidget(@path @doc("Widget name") name: string, @query("api-version") @doc("API version") apiVersion: string): Widget | Error;

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@route("/widgets/details")
@doc("Get widget details without default error response")
@get op getWidgetDetails(@query("api-version") @doc("API version") apiVersion: string): { @statusCode statusCode: 200; @body @doc("The result") result: Widget; };
