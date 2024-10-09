import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;
using Azure.Core;

@service({
  title: "Microsoft.OperationsTest",
})
@versioned(Versions)
@armProviderNamespace
namespace Microsoft.OperationStatusSample;

enum Versions {
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  `2022-11-01-preview`,
}

interface Operations extends Azure.ResourceManager.Operations {}

/** Represents a virtual machine size */
model VmSize {
  /** The name of the virtual machine size */
  name: string;
}

/** LogAnalytics operation status response */
model LogAnalyticsOperationResult {
  /** LogAnalyticsOutput */
  output: string;
}

/** Collection of virtual machine size */
model VmSizeCollection {
  /** Collection of virtual machine size */
  vmSizes: Page<VmSize>;
}

/** LogAnalytics collection of operation status response */
model LogAnalyticsCollection {
  /** LogAnalytics collection */
  logAnalytics: Page<LogAnalyticsOperationResult>;
}

@armResourceOperations
interface ProviderOperations {
  /** Operation to get virtual machines for subscription (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/getVmSizes) */
  @get
  getVmSizes is ArmProviderActionAsync<
    Response = VmSizeCollection,
    Scope = SubscriptionActionScope
  >;
  /** Operation to get virtual machines for tenant (/providers/Microsoft.ContosoProviderHub/getVmSizesTenant) */
  @get
  getVmSizesTenant is ArmProviderActionAsync<
    Response = VmSizeCollection,
    Scope = TenantActionScope
  >;
  /** Operation to get virtual machines for subscription for specific location (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}/getVmSizesLocation) */
  @get
  getVmSizesLocation is ArmProviderActionAsync<
    Response = VmSizeCollection,
    Scope = SubscriptionActionScope,
    Parameters = LocationParameter
  >;
  /** Operation to get throttled requests sharing action (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/logAnalytics/apiAccess/getThrottledRequests) */
  @get
  @action("logAnalytics/apiAccess/getThrottledRequests")
  getThrottledRequestsSubscription is ArmProviderActionAsync<
    Response = LogAnalyticsCollection,
    Scope = SubscriptionActionScope
  >;
  /** Operation to get throttled requests sharing action for tenant (/providers/Microsoft.ContosoProviderHub/logAnalytics/apiAccess/getThrottledRequests) */
  @get
  @action("logAnalytics/apiAccess/getThrottledRequests")
  getThrottledRequestsTenant is ArmProviderActionAsync<
    Response = LogAnalyticsCollection,
    Scope = TenantActionScope
  >;
}
