import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_01_01: "2024-01-01",
}

interface Operations extends Azure.ResourceManager.Operations {}

/** A custom resource with x-ms-azure-resource enabled. */
#suppress "@azure-tools/typespec-azure-core/no-openapi" "Raw x-ms-azure-resource needed to test validator-compliant control"
@extension("x-ms-azure-resource", true)
model CustomResource {
  /** The resource name. */
  name?: string;

  /** The resource type. */
  type?: string;

  /** Custom data. */
  data?: string;
}

/** Create a custom item. */
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw op needed to test swagger-level rule"
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/customItems/{itemName}")
@put
op createCustomItem(
  ...ApiVersionParameter,
  ...SubscriptionIdParameter,
  ...ResourceGroupParameter,
  @doc("The item name.") @path itemName: string,
  @doc("The custom resource body.") @body body: CustomResource,
): CustomResource | ErrorResponse;
