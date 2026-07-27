// Test: success-without-body
// Violation: GET operation returns 200 without a response body schema.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("OK with no body")
model OkNoBody {
  @doc("Status code")
  @statusCode statusCode: 200;
}

@route("/widgets/{name}")
interface Widgets {
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Raw operation to test success response bodies."
  @doc("Get a widget")
  @get op getWidget(
    @path @doc("Widget name") name: string,
    @query("api-version") @doc("API version") apiVersion: string,
  ): OkNoBody;
}
