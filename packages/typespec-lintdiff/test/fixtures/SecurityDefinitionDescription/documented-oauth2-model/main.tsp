import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.Core;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

@doc("OAuth2 authentication for this test service")
model DocumentedOAuth2 is AadOauth2Auth<["https://example.com/.default"]>;

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
  @useAuth(DocumentedOAuth2)
  @get
  @doc("Gets a widget")
  getWidget(@query("api-version") @doc("API version") apiVersion: string): Widget;
}
