// Test: put-schema-mismatch-201
// Violation: PUT request body schema differs from the 201 response schema when no 200 exists.

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
}

@doc("Widget created response body")
model WidgetCreated {
  @doc("Widget identifier")
  id: string;
  @doc("Widget name")
  name: string;
}

@doc("Created response")
model WidgetCreatedResponse {
  @doc("Status code")
  @statusCode statusCode: 201;
  @doc("Created widget")
  @body body: WidgetCreated;
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
  ): WidgetCreatedResponse;
}
