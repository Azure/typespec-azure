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

/** A nested gadget resource. */
@parentResource(Widget)
model Gadget is ProxyResource<GadgetProperties> {
  @key("gadgetName")
  @segment("gadgets")
  @doc("The name of the gadget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

/** Gadget properties. */
model GadgetProperties {
  @doc("Description of the gadget")
  description?: string;

  @doc("Provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
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

@armResourceOperations
interface Gadgets {
  /** Read gadget with extra query param. */
  @get
  @armResourceRead(Gadget)
  getWithQuery(
    ...ResourceInstanceParameters<Gadget>,
    @query @doc("Expand mode") expand?: string,
  ): ArmResponse<Gadget> | ErrorResponse;

  /** Create or update gadget with extra query param. */
  @put
  @armResourceCreateOrUpdate(Gadget)
  createOrUpdateWithQuery(
    ...ResourceInstanceParameters<Gadget>,
    @query @doc("Validation mode") validationMode?: string,
    @doc("The gadget resource.") @bodyRoot resource: Gadget,
  ): ArmResponse<Gadget> | ArmCreatedResponse<Gadget> | ErrorResponse;

  delete is ArmResourceDeleteSync<Gadget>;
}
