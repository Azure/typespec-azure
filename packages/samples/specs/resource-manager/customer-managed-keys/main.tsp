import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;
using Azure.Core;

@armProviderNamespace("Contoso.CustomerManagedKeyExample")
@service({
  title: "Contoso.CustomerManagedKeyExample",
  version: "2023-03-01-preview",
})
@doc("An example of using the Customer Managed Key Encryption properties in a resource type.")
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.UpdateTests;

interface Operations extends Azure.ResourceManager.Operations {}

@doc("Widget Resource")
model WidgetResource is TrackedResource<WidgetResourceProperties> {
  @doc("The name of the widget.")
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

@doc("Widget Resource Properties.")
model WidgetResourceProperties {
  @doc("The widget color.")
  @visibility("create", "read")
  color: string;

  ...Encryption;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<WidgetResource>;
  create is ArmResourceCreateOrUpdateAsync<WidgetResource>;
  update is ArmTagsPatchSync<WidgetResource>;
  delete is ArmResourceDeleteAsync<WidgetResource>;
  listByResourceGroup is ArmResourceListByParent<WidgetResource>;
  listBySubscription is ArmListBySubscription<WidgetResource>;
}
