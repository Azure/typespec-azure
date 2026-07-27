// Test: compliant-names
// Compliance: Valid path/query/header names and api-version should not trigger the rule.

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

@route("/widgets/{widgetName}")
@get op getWidget(
  @path("widgetName") widget: string,
  @query("filterExpression") filter?: string,
  @query("api-version") apiVersion: string,
  @header("trace-id") traceId?: string,
): Widget;
