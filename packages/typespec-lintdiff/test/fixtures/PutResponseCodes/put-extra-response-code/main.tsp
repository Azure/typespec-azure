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

/** A 202 Accepted response. */
model Accepted202 {
  /** The status code. */
  @statusCode statusCode: 202;
  /** Retry after seconds. */
  @header("Retry-After") retryAfter?: int32;
  /** The Location header. */
  @header("Location") location?: string;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;

  /** Create or update a Widget. */
  @put
  @armResourceCreateOrUpdate(Widget)
  createOrUpdate(
    ...ResourceInstanceParameters<Widget>,
    @doc("The widget resource.") @bodyRoot body: Widget,
  ): ArmResponse<Widget> | Accepted202 | ErrorResponse;

  update is ArmResourcePatchAsync<Widget, WidgetProperties>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
