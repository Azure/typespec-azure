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
model Widget is ProxyResource<WidgetProperties> {
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

/** Patch body for widget updates. */
model WidgetPatchBody {
  /** Updated description. */
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  /** Read with extra query param. */
  @get
  @armResourceRead(Widget)
  getWithQuery(
    ...ResourceInstanceParameters<Widget>,
    @query @doc("Expand mode") expand?: string,
  ): ArmResponse<Widget> | ErrorResponse;

  /** Create or update with extra query param. */
  @put
  @armResourceCreateOrUpdate(Widget)
  createOrUpdateWithQuery(
    ...ResourceInstanceParameters<Widget>,
    @query @doc("Update mode") modeHint?: string,
    @doc("The widget resource.") @bodyRoot resource: Widget,
  ): ArmResponse<Widget> | ArmCreatedResponse<Widget> | ErrorResponse;

  /** Update with extra query param. */
  @patch
  @armResourceUpdate(Widget)
  updateWithQuery(
    ...ResourceInstanceParameters<Widget>,
    @query @doc("Patch mode") patchMode?: string,
    @doc("The widget properties patch.") @body body: WidgetPatchBody,
  ): ArmResponse<Widget> | ErrorResponse;

  /** Delete with extra query param. */
  @delete
  @armResourceDelete(Widget)
  deleteWithQuery(
    ...ResourceInstanceParameters<Widget>,
    @query @doc("Delete mode") deleteMode?: string,
  ): ArmDeletedResponse | ArmDeletedNoContentResponse | ErrorResponse;

  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
