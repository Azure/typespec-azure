// Test: non-resource-post-query
// Violation: ARM POST operation that is not a resource action has an extra query parameter.

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

model SearchResponse {
  @doc("Matching values.")
  values: string[];
}

interface Operations extends Azure.ResourceManager.Operations {}

interface Searches {
  @doc("Search values.")
  @route("/providers/Microsoft.TestService/search")
  @post
  search(
    ...ApiVersionParameter,
    @doc("Filter the results.") @query("$filter") filter?: string,
  ): ArmResponse<SearchResponse> | ErrorResponse;
}
