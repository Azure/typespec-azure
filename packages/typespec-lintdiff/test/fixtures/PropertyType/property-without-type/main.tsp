// Test: property-without-type
// Violation: Use unknown type to produce a typeless property in swagger.

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
  @doc("Name")
  name: string;

  @doc("Arbitrary data - produces typeless property")
  data: unknown;
}

@route("/widgets/{name}")
@doc("Get a widget")
@get op getWidget(@path @doc("Widget name") name: string): Widget;
