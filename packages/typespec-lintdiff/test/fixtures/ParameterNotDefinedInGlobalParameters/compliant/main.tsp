// Test: compliant (ParameterNotDefinedInGlobalParameters)
// Violation: Raw operation with inline path/query parameters instead of
//   referencing global parameter definitions.

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
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

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description of the widget")
  description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
}

// Raw operation with inline subscriptionId (not from global params)
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw op to test inline parameters"
#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Testing inline api-version parameter"
@doc("Get widget details")
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}/details")
@get op getWidgetDetails(
  @doc("The subscription ID") @path subscriptionId: string,
  @doc("The resource group name") @path resourceGroupName: string,
  @doc("The widget name") @path widgetName: string,
  @doc("The API version") @query("api-version") apiVersion: string,
): {
  @statusCode statusCode: 200;
  @body result: Widget;
} | Azure.ResourceManager.CommonTypes.ErrorResponse;
