// Test: client-name-same-as-param
// Compliance: redundant @clientName is omitted from the emitted OpenAPI.

import "@typespec/http";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-client-generator-core";

using TypeSpec.Http;
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
  @doc("Name")
  name: string;
}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
#suppress "@azure-tools/typespec-azure-core/use-standard-names" "test"
@route("/widgets")
@doc("List widgets")
@get op listWidgets(
  @query @doc("Widget search term") @clientName("search") search: string,
  @query("api-version") @doc("API version") apiVersion: string,
): Widget[];
