// Test: compliant
// Violation: PATCH without merge-patch content type.

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
  @doc("ID")
  id: string;

  @doc("Name")
  name: string;
}

@route("/widgets/{id}")
@doc("Update a widget")
@patch op updateWidget(
  @path @doc("Widget ID") id: string,
  @body @doc("Widget body") widget: Widget,
): Widget;
