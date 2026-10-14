import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Spector;
using global.Azure.Core;

@doc("Azure metadata preserves an authenticated AND alternative and an anonymous OR alternative.")
@scenarioService("/azure/core/authentication/requirements")
@useAuth([ServiceAuth, ApiKeyAuth<ApiKeyLocation.header, "api-key">] | NoAuth)
namespace _Specs_.Azure.Core.Authentication.Requirements;

union ResourceAudience {
  Public: "https://service.azure.com",
  string,
}

@azureTokenAuthentication(
  #{ kind: "entraDefaultScope", defaultAudience: "Public" },
  ResourceAudience
)
model ServiceAuth is AadOauth2Auth<["https://service.azure.com/.default"]>;

@scenario
@scenarioDoc("""
  Select the authenticated alternative and supply both key valid-key and a recording
  token credential that echoes requested scopes as its access token. Expect both
  api-key: valid-key and Authorization: Bearer https://service.azure.com/.default.
  Neither credential alone satisfies this alternative. Expect response 204.
  """)
@get
@route("/combined")
op combinedCredentials(): NoContentResponse;

@scenario
@scenarioDoc("""
  Select the NoAuth alternative. Supply no credentials and send neither api-key nor
  Authorization headers. Expect response 204. The Azure profile on the authenticated
  alternative must not introduce token requests for anonymous access.
  """)
@get
@route("/anonymous")
op anonymous(): NoContentResponse;
