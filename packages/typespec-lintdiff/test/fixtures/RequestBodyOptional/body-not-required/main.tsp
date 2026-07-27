// Test: body-not-required
// Violation: PUT/PATCH/POST request bodies are optional.

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
  @doc("Widget display name")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Test fixture uses ad hoc operations to isolate request-body optionality."
@doc("Widget operations")
interface Widgets {
  @route("/widgets/{name}")
  @doc("Create or replace a widget")
  @put createOrReplace(
    @path @doc("Widget name") name: string,
    @query("api-version") @doc("API version") apiVersion: string,
    @body @doc("Widget body") body?: Widget,
  ): Widget;

  @route("/widgets/{name}")
  @doc("Update a widget")
  @patch updateWidget(
    @path @doc("Widget name") name: string,
    @query("api-version") @doc("API version") apiVersion: string,
    @body @doc("Widget body") body?: Widget,
  ): Widget;

  @route("/widgets")
  @doc("Create a widget")
  @post createWidget(
    @query("api-version") @doc("API version") apiVersion: string,
    @body @doc("Widget body") body?: Widget,
  ): Widget;
}
