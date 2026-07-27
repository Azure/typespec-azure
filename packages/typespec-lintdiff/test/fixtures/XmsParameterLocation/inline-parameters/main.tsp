// Test: inline-parameters
// No violation: TypeSpec inlines parameters in operations rather than
//   placing them in the global parameters section, so no
//   x-ms-parameter-location is required.

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

model Widget {
  @doc("The widget name")
  name: string;
}

@route("/widgets/{name}")
@get
op getWidget(@path name: string, @query("api-version") apiVersion: string): Widget;
