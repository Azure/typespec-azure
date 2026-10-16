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
  string,
}

@azureTokenAuthentication(
  #{ kind: "entraDefaultScope", defaultAudience: "Public" },
  ResourceAudience
)
model ServiceAuth is AadOauth2Auth<["https://search.azure.com/.default"]>;

@scenario
@scenarioDoc("""
  Service analogue: [Azure AI Search](https://github.com/Azure/azure-sdk-for-python/blob/1f24b9905f9ed7c96b5bdd18c95e031309e5aec4/sdk/search/azure-search-documents/azure/search/documents/_configuration.py#L42-L81) defaults token authentication to the public-cloud scope. Use token authentication without selecting an audience. The named Public default is not the first union member. A recording credential must return the requested scopes joined by a space as its access token. Expect scope https://search.azure.com/.default, the matching Bearer authorization header, and response 204.
  """)
@get
@route("/default")
op defaultAudience(): NoContentResponse;

@scenario
@scenarioDoc("""
  Service analogue: [Azure AI Search](https://github.com/Azure/azure-sdk-for-js/blob/f79733570c12f9d6be391d1df4e3497bc963e30b/sdk/search/search-documents/src/searchAudience.ts#L7-L20) exposes known public, Government, and China cloud audience values independently of the service endpoint. Select the Government audience with a recording credential that echoes requested scopes as its access token. Expect scope https://search.azure.us/.default and response 204. The service endpoint remains the mock server, not the resource URI.
  """)
@get
@route("/known")
op knownAudience(): NoContentResponse;

@scenario
@scenarioDoc("""
  Service analogue: [Azure AI Search](https://github.com/Azure/azure-sdk-for-python/blob/1f24b9905f9ed7c96b5bdd18c95e031309e5aec4/sdk/search/azure-search-documents/azure/search/documents/_patch.py#L72-L78) accepts a resource string through its audience option. The custom example.com resource is synthetic; this is not a claim that Search accepts that token. Select custom resource https://custom.example.com with a recording credential that echoes requested scopes as its access token. Expect scope https://custom.example.com/.default and response 204.
  """)
@get
@route("/custom")
op customAudience(): NoContentResponse;

@scenario
@scenarioDoc("""
  Service analogue: [Azure AI Search](https://github.com/Azure/azure-sdk-for-python/blob/1f24b9905f9ed7c96b5bdd18c95e031309e5aec4/sdk/search/azure-search-documents/azure/search/documents/_configuration.py#L42-L81) accepts an API key as an alternative to a token credential and sends it in the api-key header. Use API-key authentication with key valid-key, without selecting an audience. Expect header api-key: valid-key and response 204.
  """)
@get
@route("/key")
op apiKey(): NoContentResponse;
