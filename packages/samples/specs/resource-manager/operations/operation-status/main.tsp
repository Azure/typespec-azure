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

/**
 * Demonstrates the four standard operation status endpoint patterns using
 * GetResourceOperationStatus with the appropriate scope model.
 */
@armResourceOperations
interface OperationStatuses {
  /** Tenant scope: GET /providers/{ns}/operationStatuses/{operationId} */
  getTenantStatus is GetResourceOperationStatus;

  /** Subscription scope: GET /subscriptions/{sub}/providers/{ns}/operationStatuses/{operationId} */
  getSubscriptionStatus is GetResourceOperationStatus<
    ResourceOperationStatus,
    SubscriptionActionScope
  >;

  /** Tenant+Location scope: GET /providers/{ns}/locations/{loc}/operationStatuses/{operationId} */
  getTenantLocationStatus is GetResourceOperationStatus<
    ResourceOperationStatus,
    TenantLocationActionScope
  >;

  /** Subscription+Location scope: GET /subscriptions/{sub}/providers/{ns}/locations/{loc}/operationStatuses/{operationId} */
  getSubscriptionLocationStatus is GetResourceOperationStatus<
    ResourceOperationStatus,
    SubscriptionLocationActionScope
  >;
}
