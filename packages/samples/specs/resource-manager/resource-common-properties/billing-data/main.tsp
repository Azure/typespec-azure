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
namespace Microsoft.BillingDataExample;

/** UpdateTests API versions */
enum Versions {
  /** 2023-03-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2023-03-01-preview`,
}

interface Operations extends Azure.ResourceManager.Operations {}

model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

/** Widget resource properties. */
model WidgetProperties {
  @doc("The widget color.")
  @visibility(Lifecycle.Create, Lifecycle.Read)
  color: string;

  ...DefaultProvisioningStateProperty;
  ...BillingDataProperty;
}

@armResourceOperations
interface Widgets {
  get is ArmResourceRead<Widget>;
  create is ArmResourceCreateOrUpdateAsync<Widget>;
  update is ArmTagsPatchSync<Widget>;
  delete is ArmResourceDeleteWithoutOkAsync<Widget>;
  listByResourceGroup is ArmResourceListByParent<Widget>;
  listBySubscription is ArmListBySubscription<Widget>;
}
