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

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@route("/widgets/{name}:isEnabled")
@doc("Check whether a widget is enabled")
@get
op isWidgetEnabled(
  @path @doc("The widget name") name: string,
  @query("api-version") @doc("API version") apiVersion: string,
): boolean;
