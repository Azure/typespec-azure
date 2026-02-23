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

@armProviderNamespace("Contoso.CustomerManagedKeyExample")
@service(#{ title: "Contoso.CustomerManagedKeyExample" })
@versioned(Versions)
@doc("An example of using the Customer Managed Key Encryption properties in a resource type.")
namespace Microsoft.UpdateTests;

/** UpdateTests API versions */
enum Versions {
  /** 2023-03-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2023-03-01-preview`,
}

interface Operations extends Azure.ResourceManager.Operations {}

@doc("Widget Resource")
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget, NamePattern = "^[a-zA-Z0-9-]{3,24}$">;
}

@doc("Widget Resource Properties.")
model WidgetProperties {
  @doc("The widget color.")
  @visibility(Lifecycle.Create, Lifecycle.Read)
  color: string;

  /** Provisioning state */
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;

  ...EncryptionProperty;
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
