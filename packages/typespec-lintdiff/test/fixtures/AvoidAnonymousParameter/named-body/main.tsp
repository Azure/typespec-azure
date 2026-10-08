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

@doc("A widget sent to the service.")
model Widget {
  @doc("The user-visible widget label.")
  name: string;

  @doc("The display color of the widget.")
  color: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Isolate the request model naming check."
@route("/widgets")
@doc("Create a widget.")
@post
op createWidget(
  @query("api-version") @doc("The service API version.") apiVersion: string,
  @body @doc("The widget to create.") body: Widget,
): Widget;
