// Test: post-with-body
// Compliant: POST operation may declare a request body.

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

@doc("Search request")
model SearchRequest {
  @doc("Search query")
  query: string;
}

@doc("A widget")
model Widget {
  @doc("Widget name")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Test fixture uses ad hoc operations to isolate request-body restrictions."
interface Widgets {
  @route("/widgets/search")
  @doc("Search widgets")
  @post searchWidgets(
    @query("api-version") @doc("API version") apiVersion: string,
    @body @doc("Search body") body: SearchRequest,
  ): Widget;
}
