import "../resource.tsp";

using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  update is ArmCustomPatchSync<
    Widget,
    Widget,
    Response = ArmResponse<Widget> | ArmAcceptedResponse<ExtraHeaders = PlainLocationHeaders>
  >;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
