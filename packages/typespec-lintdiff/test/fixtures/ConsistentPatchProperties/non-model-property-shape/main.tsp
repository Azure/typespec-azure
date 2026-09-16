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
  name: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("A scalar resource property")
  values?: string;
}

@doc("PATCH properties whose same-named property emits no named properties.")
model WidgetPatchProperties {
  @doc("An array PATCH property")
  values?: string[];
}

@doc("PATCH body.")
model WidgetPatchBody {
  @doc("Resource properties to update")
  properties?: WidgetPatchProperties;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;

  @patch
  @armResourceUpdate(Widget)
  update(...ResourceInstanceParameters<Widget>, @body body: WidgetPatchBody):
    | ArmResponse<Widget>
    | ErrorResponse;
}
