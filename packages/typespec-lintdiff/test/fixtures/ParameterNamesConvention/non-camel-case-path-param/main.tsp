// Test: non-camel-case-path-param
// Violation: Path parameter "WidgetId" uses PascalCase instead of camelCase.

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

@route("/widgets/{WidgetId}")
@get op getWidget(
  @path("WidgetId") widgetId: string,
): Widget;
