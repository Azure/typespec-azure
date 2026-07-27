import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_01_01: "2024-01-01",
}

/** A test widget resource. */
model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

/** Widget properties. */
model WidgetProperties {
  /** Description of the widget. */
  description?: string;

  /** The provisioning state of the widget. */
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

/** The provisioning state of a resource. */
union ProvisioningState {
  string,
  ResourceProvisioningState,
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

/** A tracked sub-resource with location but no tags. */
model TrackedSubResource {
  /** Location. */
  location: string;
  /** Name. */
  name?: string;
}

/** Create sub-resource with location but no tags. */
#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-operation" "Raw op needed to test swagger-level rule"
@route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}/sub")
@put op createSubResource(
  @doc("The subscription ID.") @path subscriptionId: string,
  @doc("The resource group name.") @path resourceGroupName: string,
  @doc("The widget name.") @path widgetName: string,
  @doc("The API version.") @query("api-version") apiVersion: string,
  @doc("The sub-resource body.") @body body: TrackedSubResource,
): { @statusCode statusCode: 200; @body result: TrackedSubResource; } | Azure.ResourceManager.CommonTypes.ErrorResponse;
