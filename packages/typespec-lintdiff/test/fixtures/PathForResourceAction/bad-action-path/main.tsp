// Test: bad-action-path
// Violation: POST action path does not follow the expected
//   /resourceType/{name}/actionName pattern.

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

// A standalone POST at a path that doesn't end with an action name
// This creates a POST at provider level — not associated with a resource action
#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Raw op to test bad action path"
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw op to test bad action path"
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService")
namespace BadAction {
  @post
  @doc("Bad action at provider level")
  op doStuff(
    @doc("The subscription ID") @path subscriptionId: string,
    @doc("The resource group name") @path resourceGroupName: string,
    @doc("The request body") @body body: {
      @doc("Input value") value: string;
    },
  ): {
    @statusCode code: 200;
    @body result: {
      @doc("Result message") message: string;
    };
  };
}
