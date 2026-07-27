// Test: identity-required-subprops
// Violation: PATCH response has identity but the raw PATCH body omits it.

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

  ...ManagedServiceIdentityProperty;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description")
  description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("PATCH body that omits identity")
model WidgetPatchBody {
  @doc("Patchable widget properties")
  properties?: WidgetPatchProperties;
}

@doc("Patchable widget properties")
model WidgetPatchProperties {
  @doc("Description")
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Raw op to test PATCH identity handling"
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
@doc("Patch a widget outside the standard ARM resource operation template")
@patch op updateBadWidget(
  @path @doc("The subscription ID") subscriptionId: string,
  @path @doc("The resource group name") resourceGroupName: string,
  @path @doc("The widget name") widgetName: string,
  ...ApiVersionParameter,
  @bodyRoot @doc("The request body") body: WidgetPatchBody,
): Widget | ErrorResponse;
