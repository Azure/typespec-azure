import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

@doc("An endpoint dependency.")
model EndpointDependency {
  @doc("The endpoint domain name")
  domainName?: string;
}

@doc("Collection of endpoint dependencies")
model EndpointDependencyCollection is EndpointDependency[];

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  @route("/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.TestService/widgets/exampleWidget/outboundNetworkDependenciesEndpoints")
  @doc("List outbound network dependency endpoints.")
  @extension("x-ms-examples", #{})
  @get
  listOutboundNetworkDependenciesEndpoints(
    ...Azure.ResourceManager.CommonTypes.ApiVersionParameter,
  ): EndpointDependencyCollection | ErrorResponse;
}
