// Test: put-non-object-body
// Violation: PUT body parameter is typed as a non-object type (string).

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
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

@doc("Widget response.")
model WidgetResponse {
  @doc("The widget name.")
  name: string;
}

/** Create widget config with a non-object body. */
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw op needed to test swagger-level rule"
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}/config")
@put
op setWidgetConfig(
  ...ApiVersionParameter,
  ...SubscriptionIdParameter,
  ...ResourceGroupParameter,
  @doc("The widget name.") @path widgetName: string,
  @doc("The request body.") @body body: string,
): WidgetResponse | ErrorResponse;
