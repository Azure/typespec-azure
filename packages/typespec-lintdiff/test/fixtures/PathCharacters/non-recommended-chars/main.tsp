// Test: non-recommended-chars
// Violation: Path contains non-recommended characters (@).

import "@typespec/http";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.Core;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

model Widget {
  @doc("Name")
  name: string;
}

interface Widgets {
  @route("/widgets@latest")
  @doc("Get the latest widget")
  @get
  op getLatestWidget(
    @query("api-version") @doc("API version") apiVersion: string,
  ): Widget;
}
