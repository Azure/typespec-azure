// Test: missing-security-description
// Violation: Service-level API key auth emits an undocumented security definition.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;
using TypeSpec.Versioning;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
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
}

@route("/widgets")
interface Widgets {
  @get
  @doc("Gets a widget")
  getWidget(@query("api-version") @doc("API version") apiVersion: string): Widget;
}
