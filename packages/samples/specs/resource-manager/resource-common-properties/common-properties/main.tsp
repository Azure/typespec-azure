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

@armProviderNamespace("Contoso.CommonEnvelopePropertiesExample")
@service(#{ title: "Contoso.CommonEnvelopePropertiesExample" })
@versioned(Versions)
@doc("An example of using all recommended common envelope properties in a resource type. Their names all end with 'Property'.")
namespace Microsoft.UpdateTests;

/** UpdateTests API versions */
enum Versions {
  /** 2023-03-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  @previewVersion
  `2023-03-01-preview`,
}

interface Operations extends Azure.ResourceManager.Operations {}

@doc("Widget Resource")
model WidgetResource is TrackedResource<WidgetResourceProperties> {
  ...ResourceNameParameter<WidgetResource, NamePattern = "^[a-zA-Z0-9-]{3,24}$">;
  ...EntityTagProperty;
  ...ExtendedLocationProperty;
  ...ManagedByProperty;
  ...ManagedServiceIdentityProperty;
  ...ResourceKindProperty;
  ...ResourcePlanProperty;
  ...ResourceSkuProperty;
}

@doc("Widget Resource Properties.")
model WidgetResourceProperties {
  @doc("The widget color.")
  @visibility(Lifecycle.Create, Lifecycle.Read)
  color: string;

  /** Provisioning state */
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<WidgetResource>;
  create is ArmResourceCreateOrReplaceAsync<WidgetResource>;
  #suppress "@typespec/http/deprecated-implicit-optionality" "Legacy"
  update is ArmTagsPatchSync<WidgetResource>;
  delete is ArmResourceDeleteWithoutOkAsync<WidgetResource>;
  listByResourceGroup is ArmResourceListByParent<WidgetResource>;
  listBySubscription is ArmListBySubscription<WidgetResource>;
}
