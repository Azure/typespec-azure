// Test: header-param-not-kebab-case
// Violation: Header parameter "traceId" uses camelCase instead of kebab-case.

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
  @header("traceId") traceId?: string,
): Widget[];
