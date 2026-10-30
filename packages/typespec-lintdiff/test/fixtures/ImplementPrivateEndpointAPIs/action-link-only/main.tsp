import "../common.tsp";
using Azure.ResourceManager;
using TypeSpec.Http;
using TypeSpec.Rest;
namespace Microsoft.TestService;

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;

  @get
  @action("privateLinkResources")
  listPrivateLinkResources is ArmResourceActionSync<
    Widget,
    void,
    ArmResponse<ResourceListResult<PrivateLinkResource>>
  >;
}
