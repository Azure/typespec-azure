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

/** Custom widget list result without pagination. */
model CustomWidgetListResult {
  /** The list of widgets. */
  value: Widget[];
}

/** List all widgets. */
@route("/subscriptions/{subscriptionId}/providers/Microsoft.TestService/allWidgets")
@get
op listAllWidgets(
  ...ApiVersionParameter,
  ...SubscriptionIdParameter,
): CustomWidgetListResult | ErrorResponse;

/** List widgets beneath an arbitrary ARM resource URI. */
@route("/{resourceUri}/providers/Microsoft.TestService/nestedWidgets")
@get
op listWidgetsByResourceUri(
  ...ApiVersionParameter,
  @path @doc("The encoded parent ARM resource URI.") resourceUri: string,
): CustomWidgetListResult | ErrorResponse;

/** Get a specific nested widget. */
@route("/{resourceUri}/providers/Microsoft.TestService/nestedWidgets/{widgetName}")
@get
op getWidgetByResourceUri(
  ...ApiVersionParameter,
  @path @doc("The encoded parent ARM resource URI.") resourceUri: string,
  @path @doc("The nested widget name.") widgetName: string,
): CustomWidgetListResult | ErrorResponse;

/** Get the default nested widget configuration. */
@route("/{resourceUri}/providers/Microsoft.TestService/nestedWidgets/default")
@get
op getDefaultWidgetByResourceUri(
  ...ApiVersionParameter,
  @path @doc("The encoded parent ARM resource URI.") resourceUri: string,
): CustomWidgetListResult | ErrorResponse;
