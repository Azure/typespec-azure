// Test: client-name-different-via-client-name
// Violation: none. Canonical @clientName with a different value emits a valid x-ms-client-name.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ClientGenerator.Core;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget")
model Widget {
  @doc("The widget name")
  @clientName("wireName")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test fixture"
@route("/widgets/{name}")
interface Widgets {
  @doc("Get a widget")
  @get getWidget(
    @path @doc("Widget name") @clientName("wireName") name: string,
    @query("api-version") @doc("API version") apiVersion: string,
  ): Widget;
}
