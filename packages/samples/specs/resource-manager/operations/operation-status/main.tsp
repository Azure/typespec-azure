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
// A single interface can hold all scope variants.
@armResourceOperations
interface NewStyleOperationStatuses {
  // Tenant scope: GET /providers/{ns}/operationStatuses/{operationId}
  getTenantOpStatus is GetResourceOperationStatus;

  // Subscription scope: GET /subscriptions/{sub}/providers/{ns}/operationStatuses/{operationId}
  getSubscriptionOpStatus is GetResourceOperationStatus<ResourceOperationStatus, SubscriptionActionScope>;

  // Tenant+Location scope: GET /providers/{ns}/locations/{loc}/operationStatuses/{operationId}
  getTenantLocationOpStatus is GetResourceOperationStatus<
    ResourceOperationStatus,
    TenantActionScope,
    LocationResourceParameter
  >;

  // Subscription+Location scope: GET /subscriptions/{sub}/providers/{ns}/locations/{loc}/operationStatuses/{operationId}
  getSubscriptionLocationOpStatus is GetResourceOperationStatus<
    ResourceOperationStatus,
    SubscriptionActionScope,
    LocationResourceParameter
  >;
}
