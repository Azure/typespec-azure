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

@doc("A widget with additional properties")
model Widget is Record<string> {
  @doc("Widget ID")
  id: string;

  @doc("Widget name")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@route("/widgets/{id}")
@doc("Get a widget by ID")
@get op getWidget(@path @doc("The widget ID") id: string, @query("api-version") @doc("API version") apiVersion: string): Widget;
