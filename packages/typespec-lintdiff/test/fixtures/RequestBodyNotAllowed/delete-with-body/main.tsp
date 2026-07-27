// Test: delete-with-body
// Violation: DELETE operation has a request body.

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

@doc("Delete request")
model DeleteRequest {
  @doc("Deletion mode")
  mode: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Test fixture uses ad hoc operations to isolate request-body restrictions."
interface Widgets {
  @route("/widgets")
  @doc("Delete widgets")
  @delete deleteWidgets(
    @query("api-version") @doc("API version") apiVersion: string,
    @body @doc("Delete body") body: DeleteRequest,
  ): void;
}
