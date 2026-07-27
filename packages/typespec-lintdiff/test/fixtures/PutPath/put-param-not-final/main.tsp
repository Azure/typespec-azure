// Test: put-param-not-final
// Violation: PUT path includes a path parameter, but not as the final segment.

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
  @route("/settings/{settingName}/details")
  @doc("Update one setting detail")
  @put
  op replaceSettingDetail(
    @path @maxLength(50) @pattern("^[a-zA-Z0-9_-]+$") @doc("The setting name") settingName: string,
    @query("api-version") @doc("API version") apiVersion: string,
    @body @doc("Replacement settings payload") settings: Settings,
  ): Settings;
}
