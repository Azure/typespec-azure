// Test: subscription-operations
// Violation: Custom operations endpoint at subscription level instead of tenant level.

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
  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}

// Custom subscription-scoped operations endpoint (violates tenant-only requirement)
@doc("Operation display info.")
model OperationDisplay {
  @doc("Provider name")
  provider?: string;
}

@doc("Custom operation definition.")
model CustomOperation {
  @doc("Operation name")
  name?: string;

  @doc("Display info")
  display?: OperationDisplay;
}

@doc("Custom operation list result.")
model CustomOperationListResult {
  @doc("List of operations")
  value?: CustomOperation[];
}

#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Custom operations endpoint for test"
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Custom operations endpoint for test"
@route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/operations")
@doc("List operations at subscription level")
@get op listOperationsAtSub(
  @doc("The subscription ID") @path subscriptionId: string,
): CustomOperationListResult;
