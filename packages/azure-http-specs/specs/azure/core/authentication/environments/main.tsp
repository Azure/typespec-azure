import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Spector;
using global.Azure.Core;

@doc("Shared cloud endpoint and audience data with optional endpoint overrides.")
@service
@server("http://localhost:3000/public", "Default environment endpoint")
@route("/azure/core/authentication/environments")
@useAuth(ServiceAuth)
@azureServiceEnvironments(
  ServiceAuth,
  #{
    Public: #{ audience: ResourceAudience.Public, defaultEndpoint: "http://localhost:3000/public" },
    Government: #{
      audience: ResourceAudience.Government,
      defaultEndpoint: "http://localhost:3000/government",
    },
  },
  "Public"
)
namespace _Specs_.Azure.Core.Authentication.Environments;

enum ResourceAudience {
  Government: "https://api.loganalytics.us",
  Public: "https://api.loganalytics.io",
}

@azureTokenAuthentication(#{
  kind: AzureTokenAuthenticationKind.entraDefaultScope,
  defaultAudience: ResourceAudience.Public,
})
model ServiceAuth is AadOauth2Auth<["https://api.loganalytics.io/.default"]>;

// Service analogue: [Azure Monitor Logs](https://github.com/Azure/azure-sdk-for-go/blob/6aee0433368c2c3901003b9689b9ce9899e66854/sdk/monitor/query/azlogs/custom_client.go#L27-L45) defaults to AzurePublic and obtains its endpoint and audience from a cloud service configuration. This fixture retains the real resource values but substitutes local endpoints. The same cloud data applies to all emitters without requiring Go's native Cloud API.
@scenario
@scenarioDoc("""
  Supply no environment or endpoint override. The Public default selects http://localhost:3000/public and resource https://api.loganalytics.io. Use a recording credential that echoes requested scopes as its access token. Expect scope https://api.loganalytics.io/.default, request path /public/azure/core/authentication/environments/default, and response 204.
  """)
@get
@route("/default")
op defaultEnvironment(): NoContentResponse;

// Service analogue: [Azure Monitor Logs](https://github.com/Azure/azure-sdk-for-go/blob/6aee0433368c2c3901003b9689b9ce9899e66854/sdk/monitor/query/azlogs/cloud_config.go#L11-L23) defines a Government endpoint/audience pair. This fixture uses distinct local URL paths instead of real cloud endpoints.
@scenario
@scenarioDoc("""
  Select the Government environment without an endpoint override. Its pair selects http://localhost:3000/government and resource https://api.loganalytics.us. Use a recording credential that echoes requested scopes as its access token. Expect scope https://api.loganalytics.us/.default, request path /government/azure/core/authentication/environments/government, and response 204.
  """)
@get
@route("/government")
op governmentEnvironment(): NoContentResponse;

// Service analogue: [Azure Monitor Logs](https://github.com/Azure/azure-sdk-for-go/blob/6aee0433368c2c3901003b9689b9ce9899e66854/sdk/monitor/query/azlogs/custom_client.go#L35-L45) reads endpoint and audience independently from its cloud service configuration. This fixture models overriding only the endpoint while retaining the selected audience; it does not imply that the Go SDK exposes a separate endpoint option.
@scenario
@scenarioDoc("""
  Select Government and explicitly override the endpoint with http://localhost:3000/custom. Retain the Government resource. Use a recording credential that echoes requested scopes as its access token. Expect scope https://api.loganalytics.us/.default, request path /custom/azure/core/authentication/environments/endpoint-override, and response 204.
  """)
@get
@route("/endpoint-override")
op endpointOverride(): NoContentResponse;
