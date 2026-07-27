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

model Widget {
  @doc("The widget display name")
  name: string;
}

@route("/widgets/{widgetName}")
@doc("Get a widget")
@get
op getWidget(
  @path("widgetName") @doc("widgetName.") widget: string,
  @query("api-version") @doc("API version") apiVersion: string,
): Widget;
