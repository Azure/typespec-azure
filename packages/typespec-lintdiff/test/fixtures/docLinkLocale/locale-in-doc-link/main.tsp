// Test: locale-in-doc-link
// Compliance: The docLinkLocale rule has a bug in its JSONPath expression.
// The given path $..[?(@property === 'description')]^ selects the PARENT object
// of description properties, then applies pattern.match on the object (not string).
// The pattern function silently skips non-string values, so the rule never fires.
// Cannot be violated due to rule implementation bug.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget. See https://docs.microsoft.com/en-us/azure/widgets for details.")
model Widget {
  @doc("The widget name")
  name: string;
}

@route("/widgets/{name}")
@doc("Get a widget")
@get op getWidget(@path @doc("Widget name") name: string): Widget;
