// Test: compliant-with-template (ProvisioningStateSpecifiedForLROPatch)
// Violation: LRO PATCH response model does not include provisioningState.

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using TypeSpec.OpenAPI;
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

@doc("Widget config response — missing provisioningState.")
model WidgetConfigResponse {
  @doc("Config value")
  config: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}

// LRO PATCH without provisioningState in response
#suppress "@azure-tools/typespec-azure-core/no-openapi" "Need x-ms-long-running-operation for LRO test"
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw op to test LRO PATCH response"
@doc("Update widget config — LRO PATCH missing provisioningState in response")
@extension("x-ms-long-running-operation", true)
@extension("x-ms-long-running-operation-options", #{ `final-state-via`: "location" })
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}/config")
@patch op updateWidgetConfig(
  @doc("The subscription ID") @path subscriptionId: string,
  @doc("The resource group name") @path resourceGroupName: string,
  @doc("The widget name") @path widgetName: string,
  @doc("The API version") @query("api-version") apiVersion: string,
  @doc("Content type") @header contentType: "application/merge-patch+json",
  @doc("The request body") @body body: {
    @doc("Config value") config?: string;
  },
): {
  @statusCode statusCode: 200;
  @body result: WidgetConfigResponse;
} | Azure.ResourceManager.CommonTypes.ErrorResponse;
