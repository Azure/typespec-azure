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

@armResourceOperations
interface ProviderOperations {
  /** Operation to get virtual machines for provider (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/getVmSizes) */
  @get
  getVmSizes is ArmProviderActionAsync<Response = Page<VmSize>>;
  /** Operation to get virtual machines for tenant (/providers/Microsoft.ContosoProviderHub/getVmSizesTenant) */
  @get
  getVmSizesTenant is ArmTenantActionAsync<Response = Page<VmSize>>;
  /** Operation to get virtual machines for provider for specific location (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}/getVmSizesLocation) */
  @get
  getVmSizesLocation is ArmProviderActionAsync<
    Response = Page<VmSize>,
    Parameters = LocationParameter
  >;
  /** Operation to get throttled Requests sharing action (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/logAnalytics/apiAccess/getThrottledRequests) */
  @get
  @action("logAnalytics/apiAccess/getThrottledRequests")
  getThrottledRequestsSubscription is ArmProviderActionAsync<Response = Page<LogAnalyticsOperationResult>>;
  /** Operation to get throttled Requests sharing action for tenant (/providers/Microsoft.ContosoProviderHub/logAnalytics/apiAccess/getThrottledRequests) */
  @get
  @action("logAnalytics/apiAccess/getThrottledRequests")
  getThrottledRequestsTenant is ArmTenantActionAsync<Response = Page<LogAnalyticsOperationResult>>;
}
