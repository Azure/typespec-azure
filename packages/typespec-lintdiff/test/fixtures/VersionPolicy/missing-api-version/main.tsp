// Test: missing-api-version
// Violation: operations must define an api-version query parameter.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;

#suppress "tsp-lintdiff-local-linter/security-definition-description" "test"
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

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@route("/widgets/{name}")
@doc("Get a widget")
@get op getWidget(
  @path @doc("Widget name") @maxLength(64) @pattern("^[A-Za-z0-9_-]+$") name: string,
): Widget;
