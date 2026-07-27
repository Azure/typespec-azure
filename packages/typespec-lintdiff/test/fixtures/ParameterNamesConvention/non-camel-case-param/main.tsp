// Test: non-camel-case-param
// Violation: Query parameter "FilterExpression" uses PascalCase instead of camelCase.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;

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

@route("/widgets")
@doc("List widgets")
@get op listWidgets(
  @query("FilterExpression") @doc("Filter expression") filter?: string,
): Widget[];
