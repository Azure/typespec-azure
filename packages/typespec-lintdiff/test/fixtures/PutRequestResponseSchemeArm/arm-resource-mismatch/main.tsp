// Test: arm-resource-mismatch
// Violation: ARM createOrUpdate returns a different resource schema than it accepts.

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
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

model WidgetAlternate is TrackedResource<WidgetAlternateProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
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

@doc("Alternate widget resource properties.")
model WidgetAlternateProperties {
  @doc("Description")
  description?: string;

  @doc("Alternate response-only value")
  @visibility(Lifecycle.Read)
  alternateStatus?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;

  @doc("Create or update a widget")
  @put
  @armResourceCreateOrUpdate(Widget)
  createOrUpdate(
    ...ResourceInstanceParameters<Widget>,
    @doc("The request body") @bodyRoot body: Widget,
  ): ArmResponse<WidgetAlternate> | ArmCreatedResponse<WidgetAlternate> | ErrorResponse;

  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
