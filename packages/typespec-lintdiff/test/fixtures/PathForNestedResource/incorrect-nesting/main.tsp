// Test: incorrect-nesting
// Violation: Nested resource with incorrect path — uses a static name
//   instead of a parameter in the path.

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

@parentResource(Widget)
model Gadget is ProxyResource<GadgetProperties> {
  @key("gadgetName")
  @segment("gadgets")
  @doc("The name of the gadget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Gadget resource properties.")
model GadgetProperties {
  @doc("Description of the gadget")
  description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("Bad nested response.")
model BadNestedResponse {
  @doc("Response value")
  value?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}

@armResourceOperations
interface Gadgets {
  get is ArmResourceRead<Gadget>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<Gadget>;
  delete is ArmResourceDeleteSync<Gadget>;
  listByParent is ArmResourceListByParent<Gadget>;
}

// Custom incorrectly-nested path that uses a static name instead of a parameter
#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Raw op to test incorrect nesting"
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}/gadgets/badStaticName")
@doc("Get bad nested resource")
@get op getBadNested(
  @doc("The subscription ID") @path subscriptionId: string,
  @doc("The resource group name") @path resourceGroupName: string,
  @doc("The widget name") @path widgetName: string,
): BadNestedResponse;
