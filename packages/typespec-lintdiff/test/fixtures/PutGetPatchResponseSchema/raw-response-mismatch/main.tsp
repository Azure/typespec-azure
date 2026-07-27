// Test: raw-response-mismatch
// Violation: Raw ARM-style GET and PUT on the same path return different response schemas.

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
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  @doc("The name of the widget")
  name: string;
}

model WidgetAlternate is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  @doc("The name of the widget")
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description")
  description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

interface Operations extends Azure.ResourceManager.Operations {}

#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Raw ops to test mismatched ARM responses"
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
@doc("Get a widget outside the standard ARM resource operation template")
@get op getBadWidget(
  @path @doc("The subscription ID") subscriptionId: string,
  @path @doc("The resource group name") resourceGroupName: string,
  @path @doc("The widget name") widgetName: string,
  ...ApiVersionParameter,
): Widget | ErrorResponse;

#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Raw ops to test mismatched ARM responses"
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
@doc("Create or update a widget outside the standard ARM resource operation template")
@put op createBadWidget(
  @path @doc("The subscription ID") subscriptionId: string,
  @path @doc("The resource group name") resourceGroupName: string,
  @path @doc("The widget name") widgetName: string,
  ...ApiVersionParameter,
  @bodyRoot @doc("The request body") body: Widget,
): WidgetAlternate | ErrorResponse;
