// Test: no-body-action
// Violation: none. The ARM action has no request body.

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

@doc("Action result.")
model ActionResult {
  @doc("The result value")
  result: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @doc("Action without a request body")
  @action("run")
  run is ArmResourceActionSync<Widget, void, ArmResponse<ActionResult>>;
}
