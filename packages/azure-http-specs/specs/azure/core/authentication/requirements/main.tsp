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

enum ResourceAudience {
  Public: "https://service.azure.com",
}

@azureTokenAuthentication(
  #{ kind: "entraDefaultScope", defaultAudience: "Public" },
  ResourceAudience
)
model ServiceAuth is AadOauth2Auth<["https://service.azure.com/.default"]>;

// Service analogue: an Azure API Management gateway API can combine [Entra token validation](https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-protect-backend-with-aad) with a required [subscription key](https://learn.microsoft.com/en-us/azure/api-management/api-management-subscriptions#use-a-subscription-key). This fixture's api-key header and resource are synthetic; the analogue is the AND requirement, not an APIM management SDK contract.
@scenario
@scenarioDoc("""
  Select the authenticated alternative and supply both key valid-key and a recording token credential that echoes requested scopes as its access token. Expect both api-key: valid-key and Authorization: Bearer https://service.azure.com/.default. Neither credential alone satisfies this alternative. Expect response 204.
  """)
@get
@route("/combined")
op combinedCredentials(): NoContentResponse;

// Service analogue: [Azure Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/anonymous-read-access-configure#about-anonymous-read-access) permits reads without an Authorization header when anonymous access is explicitly enabled. Only the NoAuth branch is analogous; the combined token/key alternative in this fixture is not Blob Storage's authentication protocol.
@scenario
@scenarioDoc("""
  Select the NoAuth alternative. Supply no credentials and send neither api-key nor Authorization headers. Expect response 204. The Azure profile on the authenticated alternative must not introduce token requests for anonymous access.
  """)
@get
@route("/anonymous")
op anonymous(): NoContentResponse;
