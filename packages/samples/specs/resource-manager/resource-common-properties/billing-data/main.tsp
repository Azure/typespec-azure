import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.ResourceManager;
using Azure.Core;

@armProviderNamespace("Contoso.BillingDataExample")
@service(#{ title: "Contoso.BillingDataExample" })
@versioned(Versions)
@doc("An example of using BillingData a resource type.")
namespace Microsoft.UpdateTests;

/** UpdateTests API versions */
enum Versions {
  /** 2023-03-01-preview version */
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
  `2023-03-01-preview`,
}

interface Operations extends Azure.ResourceManager.Operations {}

@doc("Widget Resource")
model WidgetResource is TrackedResource<WidgetResourceProperties> {
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @doc("The name of the widget.")
  @key("widgetName")
  @segment("widgets")
  @path
  name: string;
}

@doc("Widget Resource Properties.")
model WidgetResourceProperties {
  @doc("The widget color.")
  @visibility(Lifecycle.Create, Lifecycle.Read)
  color: string;
  ...DefaultProvisioningStateProperty;
  ...BillingDataProperty;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<WidgetResource>;
  create is ArmResourceCreateOrUpdateAsync<WidgetResource>;
  update is ArmTagsPatchSync<WidgetResource>;
  delete is ArmResourceDeleteWithoutOkAsync<WidgetResource>;
  listByResourceGroup is ArmResourceListByParent<WidgetResource>;
  listBySubscription is ArmListBySubscription<WidgetResource>;
}
