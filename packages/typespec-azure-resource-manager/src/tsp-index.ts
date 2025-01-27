import { definePackageFlags } from "@typespec/compiler";
import {
  AzureResourceManagerDecorators,
  AzureResourceManagerLegacyDecorators,
} from "../generated-defs/Azure.ResourceManager.js";
import { $armCommonTypesVersion, $externalTypeRef } from "./common-types.js";
import { $armLibraryNamespace, $armProviderNamespace, $useLibraryNamespace } from "./namespace.js";
import {
  $armResourceAction,
  $armResourceCollectionAction,
  $armResourceCreateOrUpdate,
  $armResourceDelete,
  $armResourceList,
  $armResourceRead,
  $armResourceUpdate,
} from "./operations.js";
import {
  $armProviderNameValue,
  $armResourceOperations,
  $armVirtualResource,
  $customAzureResource,
  $extensionResource,
  $locationResource,
  $resourceBaseType,
  $resourceGroupResource,
  $singleton,
  $subscriptionResource,
  $tenantResource,
} from "./resource.js";

export { $lib } from "./lib.js";

/** @internal */
export const $decorators = {
  "Azure.ResourceManager": {
    armResourceCollectionAction: $armResourceCollectionAction,
    armProviderNameValue: $armProviderNameValue,
    armProviderNamespace: $armProviderNamespace,
    useLibraryNamespace: $useLibraryNamespace,
    armLibraryNamespace: $armLibraryNamespace,
    singleton: $singleton,
    tenantResource: $tenantResource,
    subscriptionResource: $subscriptionResource,
    locationResource: $locationResource,
    resourceGroupResource: $resourceGroupResource,
    extensionResource: $extensionResource,
    armResourceAction: $armResourceAction,
    armResourceCreateOrUpdate: $armResourceCreateOrUpdate,
    armResourceRead: $armResourceRead,
    armResourceUpdate: $armResourceUpdate,
    armResourceDelete: $armResourceDelete,
    armResourceList: $armResourceList,
    armResourceOperations: $armResourceOperations,
    armCommonTypesVersion: $armCommonTypesVersion,
    armVirtualResource: $armVirtualResource,
    resourceBaseType: $resourceBaseType,
  } satisfies AzureResourceManagerDecorators,
  "Azure.ResourceManager.Legacy": {
    customAzureResource: $customAzureResource,
    externalTypeRef: $externalTypeRef,
  } satisfies AzureResourceManagerLegacyDecorators,
};

export const $flags = definePackageFlags({
  decoratorArgMarshalling: "new",
});
