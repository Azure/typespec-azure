// Test: put-not-ending-with-param
// Violation: PUT operation path does not end with a path parameter.

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

@doc("Configuration settings")
model Settings {
  @doc("Selected theme")
  theme: string;
}

interface SettingsOperations {
  @route("/settings")
  @doc("Update settings")
  @put
  op replaceSettings(
    @query("api-version") @doc("API version") apiVersion: string,
    @body @doc("Replacement settings payload") settings: Settings,
  ): Settings;
}
