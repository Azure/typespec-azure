---
title: 6. Complete Example and Generate OpenApi 2.0 spec
---

To generate an OpenAPI v2 (Swagger) specification from the service definition, run the following command inside of the project folder:

```
tsp compile . --emit @azure-tools/typespec-autorest
```

This will create a file in the `tsp-output` subfolder called `openapi.json`.

You can learn more about the `typespec-autorest` emitter and its options by reading its [README.md](https://github.com/Azure/typespec-azure/blob/main/packages/typespec-autorest/README.md).

## A Complete Example

Here's a complete example `main.tsp` file based on all of the snippets in this README:

```typespec
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.ResourceManager;

@armProviderNamespace
@service({
  title: "ContosoProviderHubClient",
  version: "2021-01-01-preview",
})
@doc("Contoso Resource Provider management API.")
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,

  /** The resource is being provisioned. */
  Provisioning: "Provisioning",

  /** The resource is being updated. */
  Updating: "Updating",

  /** The resource is being deleted. */
  Deleting: "Deleting",

  /** The resource provisioning request has been accepted. */
  Accepted: "Accepted",

  string,
}

@doc("The properties of User Resource")
model UserProperties {
  @doc("The user's full name")
  fullName: string;

  @doc("The user's email address.")
  emailAddress: string;

  @doc("The status of the last operation.")
  provisioningState?: ProvisioningState;
}

@doc("A User Resource")
model User is TrackedResource<UserProperties> {
  @key("userName")
  @segment("users")
  @doc("Address name")
  @path
  name: string;
}

@doc("The details of a user notification.")
model NotificationDetails {
  @doc("The notification message.")
  message: string;

  @doc("If true, the notification is urgent.")
  urgent: boolean;
}

@armResourceOperations
interface Users {
  get is ArmResourceRead<User>;
  create is ArmResourceCreateOrReplaceAsync<User>;
  update is ArmResourcePatchSync<User, UserProperties>;
  delete is ArmResourceDeleteSync<User>;
  listByResourceGroup is ArmResourceListByParent<User>;
  listBySubscription is ArmListBySubscription<User>;
  @doc("Send a notification to the user")
  @segment("notify")
  NotifyUser is ArmResourceActionNoContentSync<User, NotificationDetails>;
}

@doc("An address resource belonging to a user resource.")
@parentResource(User)
model AddressResource is ProxyResource<AddressResourceProperties> {
  ...ResourceNameParameter<AddressResource, KeyName = "addressName", SegmentName = "addresses">;
}

@doc("The properties of AddressResource")
model AddressResourceProperties {
  @doc("The street address.")
  streetAddress: string;

  @doc("The city of the address.")
  city: string;

  @doc("The state of the address.")
  state: string;

  @doc("The zip code of the address.")
  zip: int32;

  @doc("The status of the last operation.")
  provisioningState?: ProvisioningState;
}

@armResourceOperations
interface Addresses {
  get is ArmResourceRead<AddressResource>;
  create is ArmResourceCreateOrReplaceSync<AddressResource>;
  update is ArmResourcePatchSync<AddressResource, AddressResourceProperties>;
  delete is ArmResourceDeleteSync<AddressResource>;
  listByParent is ArmResourceListByParent<AddressResource>;
  checkGlobalName is checkGlobalNameAvailability;
}
```
