import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Spector;
using global.Azure.Core;

@doc("A named challenge runtime contract rather than generated challenge algorithms.")
@scenarioService("/azure/core/authentication/challenge")
@useAuth(ServiceAuth)
namespace _Specs_.Azure.Core.Authentication.Challenge;

@azureTokenAuthentication(#{
  kind: "challengeBased",
  challengeContract: "azure.keyVaultChallenge/v1",
})
model ServiceAuth is AadOauth2Auth<[]>;

@scenario
@scenarioDoc("""
  Use a recording credential that echoes requested scopes as its access token.
  Permit the fixed mock challenge resource for this local-server test only.
  An initial unauthenticated request returns 401 with WWW-Authenticate:
  Bearer authorization="https://login.microsoftonline.com/common",
  resource="https://vault.azure.net".
  The named challenge runtime must request https://vault.azure.net/.default and retry
  with the matching Bearer authorization header. Expect the final response 204.
  """)
@get
@route("/resource")
op resourceChallenge(): NoContentResponse | ChallengeResponse;

@error
model ChallengeResponse {
  @statusCode statusCode: 401;
  @header("WWW-Authenticate") challenge: string;
}
