// Test: autorest-example
// Compliance: @Autorest.example emits x-ms-examples for the operation.

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

@route("/widgets/{name}")
@doc("Get a widget")
@Autorest.example("./examples/getWidget.json", "getWidget")
@get
op getWidget(
  @path
  @doc("Widget name")
  @maxLength(64)
  @pattern("^[A-Za-z0-9-]+$")
  name: string,
): Widget;
