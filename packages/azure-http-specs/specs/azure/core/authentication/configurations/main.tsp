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

model PublicAuth is AadOauth2Auth<
  ["https://api.loganalytics.io/.default"],
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  "https://login.microsoftonline.com/common/oauth2/v2.0/token"
>;

model GovernmentAuth is AadOauth2Auth<
  ["https://api.loganalytics.us/.default"],
  "https://login.microsoftonline.us/common/oauth2/v2.0/authorize",
  "https://login.microsoftonline.us/common/oauth2/v2.0/token"
>;

model Configurations {
  government: {
    endpoint: "http://localhost:3000/government";
    authentication: GovernmentAuth;
  };
  public: {
    endpoint: "http://localhost:3000/public";
    authentication: PublicAuth;
  };
}

// Service analogue: [Azure Monitor Logs](https://github.com/Azure/azure-sdk-for-go/blob/6aee0433368c2c3901003b9689b9ce9899e66854/sdk/monitor/query/azlogs/cloud_config.go#L8-L23) selects a cloud-specific endpoint/resource pair. Keep the real OAuth resources and authority URLs, but use local endpoints for the mock server.
@scenario
@scenarioDoc("""
  Supply no configuration or endpoint override. The required public default is not the first declared configuration. A recording credential returns requested scopes joined by a space as its access token. Expect scope https://api.loganalytics.io/.default, request path /public/azure/core/authentication/configurations/default, and response 204.
  """)
@get
@route("/default")
op defaultConfiguration(): NoContentResponse;

@scenario
@scenarioDoc("""
  Select government without overriding the endpoint. A recording credential returns requested scopes joined by a space as its access token. Expect scope https://api.loganalytics.us/.default, request path /government/azure/core/authentication/configurations/government, and response 204.
  """)
@get
@route("/government")
op governmentConfiguration(): NoContentResponse;
