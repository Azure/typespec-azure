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

@service(#{ title: "Microsoft.OperationsTest" })
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
model VmSizeCollection is Page<VmSize>;

/** LogAnalytics collection of operation status response */
model LogAnalyticsCollection is Page<LogAnalyticsOperationResult>;

@armResourceOperations
interface ProviderOperations {
  /** Operation to get virtual machines for subscription (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/getVmSizes) */
  @get
  @list
  getVmSizes is ArmProviderActionSync<Response = VmSizeCollection, Scope = SubscriptionActionScope>;
  /** Operation to get virtual machines for tenant (/providers/Microsoft.ContosoProviderHub/getVmSizesTenant) */
  @get
  @list
  getVmSizesTenant is ArmProviderActionSync<Response = VmSizeCollection, Scope = TenantActionScope>;
  /** Operation to get virtual machines for subscription for specific location (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}/getVmSizesLocation) */
  @get
  @list
  getVmSizesLocation is ArmProviderActionSync<
    Response = VmSizeCollection,
    Scope = SubscriptionActionScope,
    Parameters = LocationParameter
  >;
  /** Operation to get throttled requests sharing action (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/logAnalytics/apiAccess/getThrottledRequests) */
  @get
  @list
  @action("logAnalytics/apiAccess/getThrottledRequests")
  getThrottledRequestsSubscription is ArmProviderActionSync<
    Response = LogAnalyticsCollection,
    Scope = SubscriptionActionScope
  >;
  /** Operation to get throttled requests sharing action for tenant (/providers/Microsoft.ContosoProviderHub/logAnalytics/apiAccess/getThrottledRequests) */
  @get
  @list
  @action("logAnalytics/apiAccess/getThrottledRequests")
  getThrottledRequestsTenant is ArmProviderActionSync<
    Response = LogAnalyticsCollection,
    Scope = TenantActionScope
  >;
  /** Operation to post virtual machines for subscription (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/postVmSizes) */
  @list
  postVmSizes is ArmProviderActionAsync<
    Response = LogAnalyticsCollection,
    Scope = SubscriptionActionScope
  >;
  /** Operation to post virtual machines for subscription for specific location (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}/postVmSizesLocation) */
  @list
  postVmSizesLocation is ArmProviderActionAsync<
    Response = LogAnalyticsCollection,
    Scope = SubscriptionActionScope,
    Parameters = LocationParameter
  >;
  /** Operation to post virtual machines for subscription with retry after header (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/postVmSizesRetry) */
  postVmSizesRetry is ArmProviderActionAsync<
    Response = Azure.Core.Foundations.RetryAfterHeader,
    Scope = SubscriptionActionScope
  >;
  /** Operation to post virtual machines for subscription with ARM combined header (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/postVmSizesArmCombined) */
  postVmSizesArmCombined is ArmProviderActionAsync<
    Response = ArmCombinedLroHeaders,
    Scope = SubscriptionActionScope
  >;

  /** Sample operation to generate an extension resource based GET action */
  @get
  @action
  @list
  getLogAnalytics is ArmProviderActionSync<
    Response = LogAnalyticsCollection,
    Scope = ExtensionResourceActionScope
  >;

  /** Operation to generate an extension resource based POST action */
  @post
  @list
  @action("append")
  appendLogAnalytics is ArmProviderActionAsync<
    Response = LogAnalyticsCollection,
    Scope = ExtensionResourceActionScope
  >;
}
