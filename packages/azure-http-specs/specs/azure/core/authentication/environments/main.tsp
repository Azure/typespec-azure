import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Spector;
using global.Azure.Core;

@doc("Named audience and endpoint pairs, independent of credential authority or tenant.")
@service
@server("http://localhost:3000/public", "Default environment endpoint")
@route("/azure/core/authentication/environments")
@useAuth(ServiceAuth)
@azureServiceEnvironments(
  ServiceAuth,
  #{
    Public: #{ audience: "Public", defaultEndpoint: "http://localhost:3000/public" },
    Government: #{ audience: "Government", defaultEndpoint: "http://localhost:3000/government" },
  },
  "Public"
)
namespace _Specs_.Azure.Core.Authentication.Environments;

union ResourceAudience {
  Government: "https://service.azure.us",
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
  Supply no environment or endpoint override. The Public default selects
  http://localhost:3000/public and resource https://service.azure.com. Use a recording
  credential that echoes requested scopes as its access token. Expect scope
  https://service.azure.com/.default, request path
  /public/azure/core/authentication/environments/default, and response 204.
  """)
@get
@route("/default")
op defaultEnvironment(): NoContentResponse;

@scenario
@scenarioDoc("""
  Select the Government environment without an endpoint override. Its pair selects
  http://localhost:3000/government and resource https://service.azure.us. Use a recording credential
  that echoes requested scopes as its access token. Expect scope
  https://service.azure.us/.default, request path
  /government/azure/core/authentication/environments/government, and response 204.
  """)
@get
@route("/government")
op governmentEnvironment(): NoContentResponse;

@scenario
@scenarioDoc("""
  Select Government and explicitly override the endpoint with http://localhost:3000/custom.
  Retain the Government resource. Use a recording credential that echoes requested
  scopes as its access token. Expect scope https://service.azure.us/.default,
  request path /custom/azure/core/authentication/environments/endpoint-override,
  and response 204.
  """)
@get
@route("/endpoint-override")
op endpointOverride(): NoContentResponse;
