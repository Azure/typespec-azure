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

@doc("Shared wrapper content")
model SharedWrapperContent {
  @doc("Shared value")
  value?: string;
}

@doc("PUT allOf-only wrapper")
model PutWrapper extends SharedWrapperContent {}

@doc("PATCH allOf-only wrapper")
model PatchWrapper extends SharedWrapperContent {}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("PUT wrapper")
  putWrapper?: PutWrapper;
}

@doc("Patch envelope for widget.")
model WidgetPatchBody {
  @doc("Resource properties")
  properties?: WidgetPatchProperties;
}

@doc("Patch properties with a differently named allOf-only wrapper.")
model WidgetPatchProperties {
  @doc("PATCH wrapper")
  patchWrapper?: PatchWrapper;
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
