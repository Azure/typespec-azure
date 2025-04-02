import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using Http;
using Rest;
using Versioning;
using Azure.ResourceManager;

#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint" "cuz"
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@useDependency(Azure.ResourceManager.CommonTypes.Versions.v3)
@armLibraryNamespace
namespace Microsoft.OperationsTest;

// Tracked resources
model TestTrackedResource2 is TrackedResource<TestTrackedProperties2> {
  @pattern("^[a-zA-Z0-9-]{3,24}$")
  @doc("The name of the Tracked resource.")
  @key("trackedResourceName")
  @segment("trackedResource2s")
  @path
  name: string;
}

@armResourceOperations(TestTrackedResource2)
interface Tracked2Operations {
  get is ArmResourceRead<TestTrackedResource2>;
  create is ArmResourceCreateOrReplaceSync<TestTrackedResource2>;
  update is ArmResourcePatchSync<TestTrackedResource2, TestTrackedProperties2>;
  delete is ArmResourceDeleteSync<TestTrackedResource2>;
  listByResourceGroup is ArmResourceListByParent<TestTrackedResource2>;
  listBySubscription is ArmListBySubscription<TestTrackedResource2>;
}

@doc("rp-specific properties for the resource with all envelope properties")
model TestTrackedProperties2 {
  @doc("The status of the last operation performed on this resource.")
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;

  @doc("Name of the resource")
  displayName?: string = "default";
}
