// Test: raw-collection-get
// Violation: collection-shaped GETs are checked even when they are not registered ARM resource list operations.

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

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw operation needed to test the Swagger rule's path-based collection selector."
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}/records")
@get
op listRecords(
  @path @doc("The subscription identifier") subscriptionId: string,
  @path @doc("The resource group name") resourceGroupName: string,
  @path @doc("The widget name") widgetName: string,
  ...ApiVersionParameter,
  @query @doc("Continuation token") continuationToken?: string,
): string | ErrorResponse;
