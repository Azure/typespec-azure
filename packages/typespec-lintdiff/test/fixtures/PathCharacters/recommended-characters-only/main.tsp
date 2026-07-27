// Test: recommended-characters-only
// No violation: Path uses only recommended characters.

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
  @route("/A0.B1.C2/D3_E4_F5/GHI-JKL-MNO/~PQRSTUVWXYZ")
  @doc("List widgets")
  @get
  op listWidgets(
    @query("api-version") @doc("API version") apiVersion: string,
  ): Widget;
}
