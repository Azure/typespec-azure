import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Spector;
using global.Azure.Core;

@doc("Paired endpoint and OAuth configurations, shared by every language emitter.")
@service
@route("/azure/core/authentication/configurations")
@azureServiceConfigurations(Configurations)
namespace _Specs_.Azure.Core.Authentication.Configurations;

model PublicAuth is OAuth2Auth<[
  {
    type: OAuth2FlowType.clientCredentials;
    tokenUrl: "http://localhost:3000/azure/core/authentication/configurations/oauth2/public/token";
    scopes: ["https://api.loganalytics.io/.default"];
  }
]>;

model GovernmentAuth is OAuth2Auth<[
  {
    type: OAuth2FlowType.clientCredentials;
    tokenUrl: "http://localhost:3000/azure/core/authentication/configurations/oauth2/government/token";
    scopes: ["https://api.loganalytics.us/.default"];
  }
]>;

const Configurations: Record<AzureServiceConfiguration> = #{
  government: #{
    endpoint: "http://localhost:3000/government",
    authentication: typeref(GovernmentAuth),
  },
  public: #{ endpoint: "http://localhost:3000/public", authentication: typeref(PublicAuth) },
};

// Azure Monitor Logs selects cloud-specific endpoint/resource pairs; local token URLs keep this test independent of a real identity provider.
@scenario
@scenarioDoc("""
  Supply no configuration or endpoint override. The required public default is not the first declared configuration. Use a credential that exchanges the selected configuration's scopes at its tokenUrl. POST form-encoded grant_type=client_credentials, client_id=mock-client-id, client_secret=mock-client-secret, and scope=https://api.loganalytics.io/.default to /azure/core/authentication/configurations/oauth2/public/token. Use the returned access_token as a Bearer token for /public/azure/core/authentication/configurations/default and expect 204. Both the token exchange and the service request are required; do not use a fixed-token credential.
  """)
@get
@route("/default")
op defaultConfiguration(): NoContentResponse;

@scenario
@scenarioDoc("""
  Select government without overriding the endpoint. Use a credential that exchanges the selected configuration's scopes at its tokenUrl. POST form-encoded grant_type=client_credentials, client_id=mock-client-id, client_secret=mock-client-secret, and scope=https://api.loganalytics.us/.default to /azure/core/authentication/configurations/oauth2/government/token. Use the returned access_token as a Bearer token for /government/azure/core/authentication/configurations/government and expect 204. Both the token exchange and the service request are required; do not use a fixed-token credential.
  """)
@get
@route("/government")
op governmentConfiguration(): NoContentResponse;
