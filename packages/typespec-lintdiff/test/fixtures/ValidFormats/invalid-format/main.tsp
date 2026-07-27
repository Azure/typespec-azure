// Test: invalid-format
// Compliance: TypeSpec type system maps to valid OpenAPI formats.

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

@doc("A widget")
model Widget {
  @doc("Name")
  name: string;

  @doc("Count")
  count: int32;

  @doc("ID")
  id: int64;
}

@route("/widgets/{name}")
@doc("Get a widget")
@get op getWidget(@path @doc("Widget name") name: string): Widget;
