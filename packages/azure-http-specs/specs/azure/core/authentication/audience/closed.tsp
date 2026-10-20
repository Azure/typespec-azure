import "@typespec/http";
import "@typespec/spector";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using Spector;
using global.Azure.Core;

@doc("A closed audience enum without a custom-resource branch.")
@scenarioService("/azure/core/authentication/audience/closed")
@useAuth(ServiceAuth)
namespace _Specs_.Azure.Core.Authentication.Audience.Closed;

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

// Service analogue: [Azure AI Search](https://github.com/Azure/azure-sdk-for-js/blob/f79733570c12f9d6be391d1df4e3497bc963e30b/sdk/search/search-documents/src/searchAudience.ts#L7-L20) supplies named cloud audience values. Closing that family to an enum is synthetic authoring coverage here, not a claim that Search rejects custom audiences.
@scenario
@scenarioDoc("""
  Do not select an audience. Use a recording credential that echoes requested scopes as its access token. Expect scope https://service.azure.com/.default and response 204.
  """)
@get
@route("/default")
op defaultAudience(): NoContentResponse;

// Service analogue: [Azure AI Search](https://github.com/Azure/azure-sdk-for-js/blob/f79733570c12f9d6be391d1df4e3497bc963e30b/sdk/search/search-documents/src/searchAudience.ts#L7-L20) supplies a named Government audience. This fixture deliberately uses a closed enum and synthetic service.azure.us resource rather than reproducing Search's extensible audience API.
@scenario
@scenarioDoc("""
  Select the Government enum member. Use a recording credential that echoes requested scopes as its access token. Expect scope https://service.azure.us/.default and response 204. The audience API represents only the declared enum values.
  """)
@get
@route("/known")
op knownAudience(): NoContentResponse;
