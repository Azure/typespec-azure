import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.ResourceManager;

@service(#{ title: "Microsoft.OperationsTest" })
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.OperationStatusSample;

enum Versions {
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2022-11-01-preview`,
}

interface Operations extends Azure.ResourceManager.Operations {}

/** The standard operation status */
@parentResource(TenantLocationResource)
model MyOpStatus is ArmOperationStatus;

/** The standard operation status at the subscription level] */
@parentResource(SubscriptionLocationResource)
model MySubOpStatus is ArmOperationStatus;

@parentResource(ArmLocationResource<"ResourceGroup">)
model MyResourceGroupStatus is ArmOperationStatus;

@armResourceOperations
interface OperationStatuses {
  getStatus is ArmResourceRead<MyOpStatus>;
  getSubscriptionStatus is ArmResourceRead<MySubOpStatus>;
  getRgStatus is ArmResourceRead<MyResourceGroupStatus>;
}

// New recommended pattern: use GetResourceOperationStatus with ResourceOperationStatus.
// This doesn't use @parentResource decorators and doesn't have @path on the id field.

@armResourceOperations
interface NewStyleTenantOperationStatuses {
  // Tenant scope: GET /providers/{providerNamespace}/operationStatuses/{operationId}
  getOpStatus is GetResourceOperationStatus;
}

@armResourceOperations
interface NewStyleSubscriptionOperationStatuses {
  // Subscription scope: GET /subscriptions/{subscriptionId}/providers/{providerNamespace}/operationStatuses/{operationId}
  getOpStatus is GetResourceOperationStatus<ResourceOperationStatus, SubscriptionActionScope>;
}

@armResourceOperations
interface NewStyleSubscriptionLocationOperationStatuses {
  // Subscription+Location scope: GET /subscriptions/{subscriptionId}/providers/{providerNamespace}/locations/{location}/operationStatuses/{operationId}
  getOpStatus is GetResourceOperationStatus<
    ResourceOperationStatus,
    SubscriptionActionScope,
    LocationResourceParameter
  >;
}
