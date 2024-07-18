/** An error here would mean that the decorator is not exported or doesn't have the right name. */
import {
  $armCommonTypesVersion,
  $armLibraryNamespace,
  $armProviderNameValue,
  $armProviderNamespace,
  $armResourceAction,
  $armResourceCollectionAction,
  $armResourceCreateOrUpdate,
  $armResourceDelete,
  $armResourceList,
  $armResourceOperations,
  $armResourceRead,
  $armResourceUpdate,
  $armVirtualResource,
  $extensionResource,
  $locationResource,
  $resourceBaseType,
  $resourceGroupResource,
  $singleton,
  $subscriptionResource,
  $tenantResource,
  $useLibraryNamespace,
} from "@azure-tools/typespec-azure-resource-manager";
import type {
  ArmCommonTypesVersionDecorator,
  ArmLibraryNamespaceDecorator,
  ArmProviderNameValueDecorator,
  ArmProviderNamespaceDecorator,
  ArmResourceActionDecorator,
  ArmResourceCollectionActionDecorator,
  ArmResourceCreateOrUpdateDecorator,
  ArmResourceDeleteDecorator,
  ArmResourceListDecorator,
  ArmResourceOperationsDecorator,
  ArmResourceReadDecorator,
  ArmResourceUpdateDecorator,
  ArmVirtualResourceDecorator,
  ExtensionResourceDecorator,
  LocationResourceDecorator,
  ResourceBaseTypeDecorator,
  ResourceGroupResourceDecorator,
  SingletonDecorator,
  SubscriptionResourceDecorator,
  TenantResourceDecorator,
  UseLibraryNamespaceDecorator,
} from "./Azure.ResourceManager.js";

type Decorators = {
  $armResourceCollectionAction: ArmResourceCollectionActionDecorator;
  $armProviderNameValue: ArmProviderNameValueDecorator;
  $armProviderNamespace: ArmProviderNamespaceDecorator;
  $useLibraryNamespace: UseLibraryNamespaceDecorator;
  $armLibraryNamespace: ArmLibraryNamespaceDecorator;
  $singleton: SingletonDecorator;
  $tenantResource: TenantResourceDecorator;
  $subscriptionResource: SubscriptionResourceDecorator;
  $locationResource: LocationResourceDecorator;
  $resourceGroupResource: ResourceGroupResourceDecorator;
  $extensionResource: ExtensionResourceDecorator;
  $armResourceAction: ArmResourceActionDecorator;
  $armResourceCreateOrUpdate: ArmResourceCreateOrUpdateDecorator;
  $armResourceRead: ArmResourceReadDecorator;
  $armResourceUpdate: ArmResourceUpdateDecorator;
  $armResourceDelete: ArmResourceDeleteDecorator;
  $armResourceList: ArmResourceListDecorator;
  $armResourceOperations: ArmResourceOperationsDecorator;
  $armCommonTypesVersion: ArmCommonTypesVersionDecorator;
  $armVirtualResource: ArmVirtualResourceDecorator;
  $resourceBaseType: ResourceBaseTypeDecorator;
};

/** An error here would mean that the exported decorator is not using the same signature. Make sure to have export const $decName: DecNameDecorator = (...) => ... */
const _: Decorators = {
  $armResourceCollectionAction,
  $armProviderNameValue,
  $armProviderNamespace,
  $useLibraryNamespace,
  $armLibraryNamespace,
  $singleton,
  $tenantResource,
  $subscriptionResource,
  $locationResource,
  $resourceGroupResource,
  $extensionResource,
  $armResourceAction,
  $armResourceCreateOrUpdate,
  $armResourceRead,
  $armResourceUpdate,
  $armResourceDelete,
  $armResourceList,
  $armResourceOperations,
  $armCommonTypesVersion,
  $armVirtualResource,
  $resourceBaseType,
};
