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

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@route("/widgets/{name}")
@doc("Delete a widget")
@delete op deleteWidget(@path @doc("Widget name") name: string, @query("api-version") @doc("API version") apiVersion: string): void;

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@route("/widgets/{name}/config")
@doc("Delete widget config without 204")
@delete op deleteWidgetConfig(@path @doc("Widget name") name: string, @query("api-version") @doc("API version") apiVersion: string): { @statusCode statusCode: 200; };
