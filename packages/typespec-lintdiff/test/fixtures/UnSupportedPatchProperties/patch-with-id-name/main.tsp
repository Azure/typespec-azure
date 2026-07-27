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

/** Custom patch body with unsupported properties. */
model WidgetPatch {
  /** Resource ID - should not be in PATCH. */
  id?: string;

  /** Resource name - should not be in PATCH. */
  name?: string;

  /** Resource type - should not be in PATCH. */
  type?: string;

  /** Tags. */
  #suppress "@azure-tools/typespec-azure-resource-manager/arm-no-record" "Record needed for tags in PATCH body"
  tags?: Record<string>;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;

  /** Update widget. */
  @patch
  @armResourceUpdate(Widget)
  update(
    ...ResourceInstanceParameters<Widget>,
    @doc("The widget patch body.") @body body: WidgetPatch,
  ): ArmResponse<Widget> | ErrorResponse;

  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
