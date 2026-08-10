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

/** A test widget resource. */
model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

/** Widget properties. */
model WidgetProperties {
  @doc("Description of the widget")
  description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface ResourceGroups {
  /** Deletes a providerless resource group. */
  @delete
  @armResourceDelete(Widget)
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}")
  delete(
    @path @doc("The subscription identifier") subscriptionId: string,
    @path @doc("The resource group name") resourceGroupName: string,
    @query @doc("Resource types to force delete") forceDeletionTypes?: string,
  ): ArmDeletedResponse | ArmDeleteAcceptedLroResponse | ErrorResponse;
}
