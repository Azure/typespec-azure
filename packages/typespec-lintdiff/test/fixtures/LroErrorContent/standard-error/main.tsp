import "../../lib/imports.tsp";
using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.ResourceManager;

@armProviderNamespace
@service
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.StandardErrors;

model Widget is TrackedResource<WidgetProperties> {
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}
model WidgetProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}
model ErrorCopy is CommonTypes.ErrorResponse;
interface Operations extends Azure.ResourceManager.Operations {}
@armResourceOperations
interface Widgets {
  read is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  action is ArmResourceActionAsync<Widget, void, void, Error = ErrorCopy>;
}
