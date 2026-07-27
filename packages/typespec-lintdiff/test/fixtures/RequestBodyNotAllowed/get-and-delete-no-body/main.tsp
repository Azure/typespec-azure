// Test: get-and-delete-no-body
// Compliant: GET and DELETE operations omit request bodies.

import "@typespec/http";
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
  @doc("Widget name")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Test fixture uses ad hoc operations to isolate request-body restrictions."
interface Widgets {
  @route("/widgets/current")
  @doc("Read a widget")
  @get getWidget(
    @query("api-version") @doc("API version") apiVersion: string,
  ): Widget;

  @route("/widgets/current")
  @doc("Delete a widget")
  @delete deleteWidget(
    @query("api-version") @doc("API version") apiVersion: string,
  ): void;
}
