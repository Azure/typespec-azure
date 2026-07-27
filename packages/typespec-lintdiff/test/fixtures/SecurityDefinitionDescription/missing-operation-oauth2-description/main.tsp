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
  @useAuth(
    OAuth2Auth<
      [
        AadTokenAuthFlow<
          ["https://example.com/.default"],
          "https://login.microsoftonline.com/common/oauth2/authorize",
          "https://login.microsoftonline.com/common/oauth2/token"
        >,
      ]
    >
  )
  @get
  @doc("Gets a widget")
  getWidget(@query("api-version") @doc("API version") apiVersion: string): Widget;
}
