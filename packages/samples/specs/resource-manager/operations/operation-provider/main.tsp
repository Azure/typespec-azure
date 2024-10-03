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

/** Represents a virtual machine */
model VirtualMachine {
  /** the name of the virtual machine */
  name: string;
}

/** Represents a throttled request */
model ThrottledRequest {
  /** The reason for throttling */
  reason: string;
}

@armResourceOperations
interface ProviderOperations {
  /** Operation to get virtual machines for provider (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/getVirtualMachines) */
  @get
  getVirtualMachines is ArmProviderActionAsync<Response = Page<VirtualMachine>>;
  /** Operation to get virtual machines for tenant (/providers/Microsoft.ContosoProviderHub/getVirtualMachinesTenant) */
  @get
  getVirtualMachinesTenant is ArmTenantActionAsync<Response = Page<VirtualMachine>>;
  /** Operation to get virtual machines for provider for specific location (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}/getVirtualMachinesAtLocation) */
  @get
  getVirtualMachinesAtLocation is ArmProviderActionAsync<
    Response = Page<VirtualMachine>,
    Parameters = LocationParameter
  >;
  /** Operation to get throttled Requests sharing action (/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/logAnalytics/apiAccess/getThrottledRequests) */
  @get
  @action("logAnalytics/apiAccess/getThrottledRequests")
  getThrottledRequestsForSubscription is ArmProviderActionAsync<Response = Page<ThrottledRequest>>;
  /** Operation to get throttled Requests sharing action for tenant (/providers/Microsoft.ContosoProviderHub/logAnalytics/apiAccess/getThrottledRequests) */
  @get
  @action("logAnalytics/apiAccess/getThrottledRequests")
  getThrottledRequestsForTenant is ArmTenantActionAsync<Response = Page<ThrottledRequest>>;
}
