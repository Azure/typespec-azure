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

@doc("Nested values")
model NestedValues {
  @doc("Nested string")
  nestedValue?: string;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Scalar value")
  scalarValue?: string;

  @doc("Array value")
  arrayValue?: string[];

  @doc("Record value")
  recordValue?: Record<string>;

  @doc("Union value")
  unionValue?: string | int32;

  @doc("Nullable nested value")
  nullableNested?: NestedValues | null;

  @doc("Empty model value")
  emptyValue?: {};
}

@doc("Patch envelope for widget.")
model WidgetPatchBody {
  @doc("Resource properties")
  properties?: WidgetPatchProperties;
}

@doc("Patch properties covering emitted type families.")
model WidgetPatchProperties {
  @doc("Scalar value")
  scalarValue?: string;

  @doc("Array value")
  arrayValue?: string[];

  @doc("Record value")
  recordValue?: Record<string>;

  @doc("Union value")
  unionValue?: string | int32;

  @doc("Nullable nested value")
  nullableNested?: NestedValues | null;

  @doc("Empty model value")
  emptyValue?: {};
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
