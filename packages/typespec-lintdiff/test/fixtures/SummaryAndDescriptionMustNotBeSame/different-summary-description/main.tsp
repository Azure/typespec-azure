// Test: different-summary-description
// Compliant: Operation summary and description are different.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget")
model Widget {
  @doc("The widget name")
  name: string;
}

@route("/widgets")
@get
@summary("List widgets")
@doc("Gets the widgets in the collection.")
op listWidgets(): Widget[];
