import "../common.tsp";
using Azure.ResourceManager;
namespace Microsoft.TestService;

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;

  getPrivateEndpointConnection is WidgetPrivateEndpointConnections.Read<Widget>;
  listPrivateEndpointConnections is WidgetPrivateEndpointConnections.ListByParent<Widget>;
}
