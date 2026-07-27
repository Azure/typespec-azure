// Test: colon-in-nonfinal-literal-segment
// Violation: A non-final literal segment contains a colon.

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
  @route("/foo:bar/{baz}")
  @doc("Get a widget")
  @get
  op getWidget(
    @path @doc("Baz") baz: string,
    @query("api-version") @doc("API version") apiVersion: string,
  ): Widget;
}
