// Test: nested-provider-namespace
// Violation: operations in child namespaces inherit the ARM provider namespace.

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

namespace Subarea {
  #suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw operation needed to test inherited ARM provider detection."
  @route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/widgets")
  @get
  op listWidgets(
    @path @doc("The subscription identifier") subscriptionId: string,
    ...ApiVersionParameter,
    @query @doc("Continuation token") continuationToken?: string,
  ): string | ErrorResponse;
}
