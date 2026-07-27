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
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @path
  name: string;
}

model WidgetProperties {
  @doc("Description of the widget")
  description?: string;

  @doc("Provisioning state of the widget")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

model WidgetPatchRequest {
  @doc("Updated description")
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;

  @doc("Patch widget metadata")
  @patch
  @armResourceAction(Widget)
  patchMetadata(
    ...ResourceInstanceParameters<Widget>,
    @header contentType: "application/merge-patch+json",
    @body body: WidgetPatchRequest,
  ): {
    @statusCode code: 200;
    @body result: Widget;
  } | ErrorResponse;
}
