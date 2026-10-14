import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Spector;
using global.Azure.Core;

@doc("Resource-valued audiences with API-key or token authentication.")
@scenarioService("/azure/core/authentication/audience")
@useAuth(ServiceAuth | ApiKeyAuth<ApiKeyLocation.header, "api-key">)
namespace _Specs_.Azure.Core.Authentication.Audience;

/** Known resources and an open branch for custom resources. */
union ResourceAudience {
  Government: "https://search.azure.us",
  Public: "https://search.azure.com",
  TrailingSlash: "https://trailing.example.com/",
  string,
}

@azureTokenAuthentication(
  #{ kind: "entraDefaultScope", defaultAudience: "Public" },
  ResourceAudience
)
model ServiceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;

@scenario
@scenarioDoc("""
  Use token authentication without selecting an audience. The named Public default is
  not the first union member. A recording credential must return the requested scopes
  joined by a space as its access token. Expect scope https://search.azure.com/.default,
  the matching Bearer authorization header, and response 204.
  """)
@get
@route("/default")
op defaultAudience(): NoContentResponse;

@scenario
@scenarioDoc("""
  Select the Government audience with a recording credential that echoes requested
  scopes as its access token. Expect scope https://search.azure.us/.default and
  response 204. The service endpoint remains the mock server, not the resource URI.
  """)
@get
@route("/known")
op knownAudience(): NoContentResponse;

@scenario
@scenarioDoc("""
  Select custom resource https://custom.example.com with a recording credential
  that echoes requested scopes as its access token. Expect scope
  https://custom.example.com/.default and response 204.
  """)
@get
@route("/custom")
op customAudience(): NoContentResponse;

@scenario
@scenarioDoc("""
  Select the TrailingSlash resource https://trailing.example.com/ with a recording
  credential that echoes requested scopes as its access token. Preserve the resource
  slash: expect scope https://trailing.example.com//.default and response 204.
  """)
@get
@route("/trailing-slash")
op trailingSlash(): NoContentResponse;

@scenario
@scenarioDoc("""
  Use API-key authentication with key valid-key, without selecting an audience.
  Expect header api-key: valid-key and response 204.
  """)
@get
@route("/key")
op apiKey(): NoContentResponse;
