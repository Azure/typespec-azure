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

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @doc("The name of the widget")
  @path
  @pattern("^[a-zA-Z0-9_-]+$")
  name: string;
}

model WidgetProperties {
  description?: string;
}

model PatchBase {
  @encodedName("application/json", "name")
  resourceName?: string;
}

model WidgetPatch extends PatchBase {
  @encodedName("application/json", "location")
  region?: string;

  properties?: WidgetPatchProperties;
}

model PatchPropertiesBase {
  @encodedName("application/json", "provisioningState")
  state?: ResourceProvisioningState;
}

model WidgetPatchProperties extends PatchPropertiesBase {
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;

  @patch
  @armResourceUpdate(Widget)
  update(...ResourceInstanceParameters<Widget>, @body body: WidgetPatch):
    | ArmResponse<Widget>
    | ErrorResponse;

  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
}
