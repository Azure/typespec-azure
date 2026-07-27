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

#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Raw op to test invalid ARM path"
@route("/subscriptions/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}")
@doc("Create widget with missing subscriptionId path parameter")
@put op createBadWidget(
  @doc("The resource group name") @path resourceGroupName: string,
  @doc("The widget name") @path widgetName: string,
  ...ApiVersionParameter,
  @doc("The request body") @bodyRoot body: WidgetProperties,
): Widget | ErrorResponse;
