// Test: non-get-collection
// Violation: none. The rule only applies to GET operations.

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

interface Operations extends Azure.ResourceManager.Operations {}

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw operation needed to test the HTTP method boundary."
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets")
@post
op searchWidgets(
  @path @doc("The subscription identifier") subscriptionId: string,
  @path @doc("The resource group name") resourceGroupName: string,
  ...ApiVersionParameter,
  @query @doc("Search expression") search?: string,
): string | ErrorResponse;
