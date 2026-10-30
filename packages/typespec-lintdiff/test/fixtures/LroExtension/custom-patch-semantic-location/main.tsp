import "../resource.tsp";

using Azure.ResourceManager;

namespace Microsoft.TestService;

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  update is ArmCustomPatchAsync<
    Widget,
    Widget,
    LroHeaders = ArmLroLocationHeader<FinalResult = Widget> &
      Azure.Core.Foundations.RetryAfterHeader
  >;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
