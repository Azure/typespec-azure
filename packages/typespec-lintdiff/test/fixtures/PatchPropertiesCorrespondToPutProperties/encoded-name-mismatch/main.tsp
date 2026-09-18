import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v6)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
  v2024_01_01: "2024-01-01",
}

model Widget is ProxyResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description")
  description?: string;

  @doc("Resource provisioning state")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@doc("Patch envelope for widget.")
model WidgetPatchBody {
  @doc("Resource properties with extra field not in PUT model")
  properties?: WidgetPatchProperties;
}

@doc("Patch properties with an extra property not in the PUT model.")
model WidgetPatchProperties {
  @doc("Description")
  @encodedName("application/json", "patchDescription")
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;

  @doc("Update widget")
  @patch
  @armResourceUpdate(Widget)
  update(
    ...ResourceInstanceParameters<Widget>,
    @doc("The request body") @body body: WidgetPatchBody,
  ): ArmResponse<Widget> | ErrorResponse;
}
