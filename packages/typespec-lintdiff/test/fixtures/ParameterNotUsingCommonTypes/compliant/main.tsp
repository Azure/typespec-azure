// Test: compliant
// Violation: Inline subscriptionId parameter not using common-types $ref.

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
  @doc("Name")
  name: string;
}

@route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgets/{name}")
@doc("Get a widget")
@get op getWidget(
  @path @doc("Subscription ID") subscriptionId: string,
  @path @doc("Widget name") name: string,
): Widget;
