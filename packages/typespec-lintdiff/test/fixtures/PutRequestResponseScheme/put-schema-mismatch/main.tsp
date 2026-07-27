// Test: put-schema-mismatch
// Violation: PUT request body schema differs from 200 response schema.

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

@doc("Widget create request")
model WidgetRequest {
  @doc("Widget name")
  name: string;
  @doc("Widget color")
  color?: string;
}

@doc("Widget response")
model WidgetResponse {
  @doc("Widget identifier")
  id: string;
  @doc("Widget name")
  name: string;
  @doc("Widget color")
  color?: string;
}

@route("/widgets/{name}")
interface Widgets {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  #suppress "@azure-tools/typespec-azure-core/use-standard-names" "test"
  @doc("Create or update a widget")
  @put createOrUpdate(
    @doc("Widget name")
    @path name: string,
    @doc("API version")
    @query("api-version") apiVersion: string,
    @doc("Widget body")
    @body body: WidgetRequest,
  ): WidgetResponse;
}
