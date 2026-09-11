// Test: no-request-body
// Violation: none. PUT operations without an emitted request body are outside this schema comparison.

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

@doc("Widget payload")
model Widget {
  @doc("Widget name")
  name: string;

  @doc("Widget color")
  color?: string;
}

@route("/widgets/{name}")
interface Widgets {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
  #suppress "@azure-tools/typespec-azure-core/use-standard-names" "test"
  @doc("Create or update a widget without a request body")
  @put
  createOrUpdate(
    @doc("Widget name")
    @path
    name: string,

    @doc("API version")
    @query("api-version")
    apiVersion: string,

    @doc("No request body")
    @body
    body: void,
  ): Widget;
}
