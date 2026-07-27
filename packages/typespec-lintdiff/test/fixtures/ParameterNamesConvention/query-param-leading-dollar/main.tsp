// Test: query-param-leading-dollar
// Violation: Query parameter "$skip" begins with '$'.

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
  @query("$skip") skip?: int32,
): Widget[];
