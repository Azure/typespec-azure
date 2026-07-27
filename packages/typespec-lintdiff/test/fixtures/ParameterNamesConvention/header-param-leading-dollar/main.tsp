// Test: header-param-leading-dollar
// Violation: Header parameter "$request-id" begins with '$'.

import "@typespec/http";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

model Widget {
  name: string;
}

@route("/widgets")
@get op listWidgets(
  @header("$request-id") requestId?: string,
): Widget[];
