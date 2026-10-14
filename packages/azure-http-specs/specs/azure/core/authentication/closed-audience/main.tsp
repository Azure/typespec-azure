import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Spector;
using global.Azure.Core;

@doc("A closed audience enum without a custom-resource branch.")
@scenarioService("/azure/core/authentication/closed-audience")
@useAuth(ServiceAuth)
namespace _Specs_.Azure.Core.Authentication.ClosedAudience;

/** The supported resource values; the named default is not the first member. */
enum ResourceAudience {
  Government: "https://service.azure.us",
  Public: "https://service.azure.com",
}

@azureTokenAuthentication(
  #{ kind: "entraDefaultScope", defaultAudience: "Public" },
  ResourceAudience
)
model ServiceAuth is AadOauth2Auth<["https://service.azure.com/.default"]>;

@scenario
@scenarioDoc("""
  Do not select an audience. Use a recording credential that echoes requested scopes
  as its access token. Expect scope https://service.azure.com/.default and response 204.
  """)
@get
@route("/default")
op defaultAudience(): NoContentResponse;

@scenario
@scenarioDoc("""
  Select the Government enum member. Use a recording credential that echoes requested
  scopes as its access token. Expect scope https://service.azure.us/.default and
  response 204. The audience API represents only the declared enum values.
  """)
@get
@route("/known")
op knownAudience(): NoContentResponse;
