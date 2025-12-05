import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";

using TypeSpec.Rest;
using TypeSpec.Http;
using Azure.Core;
using Azure.ResourceManager;
using TypeSpec.Versioning;

/**
 * Compute Client
 */
@armProviderNamespace
@service(#{ title: "Azure Compute resource management API." })
@versioned(Versions)
namespace Microsoft.Compute;

/**
 * The available API versions.
 */
enum Versions {
  /**
   * The 2024-11-01 API version.
   */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_11_01: "2024-11-01",

  /**
   * The 2025-04-01 API version.
   */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2025_04_01: "2025-04-01",
}

/**
 * Describes a Virtual Machine.
 */
model VirtualMachine is Azure.ResourceManager.TrackedResource<VirtualMachineProperties> {
  ...ResourceNameParameter<
    Resource = VirtualMachine,
    KeyName = "vmName",
    SegmentName = "virtualMachines",
    NamePattern = ""
  >;
}

model VirtualMachineProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@armResourceOperations
interface VirtualMachines {
  /**
   * Retrieves information about the model view or the instance view of a virtual machine.
   */
  get is ArmResourceRead<VirtualMachine>;

  /**
   * The operation to create or update a virtual machine. Please note some properties can be set only during virtual machine creation.
   */
  createOrUpdate is ArmResourceCreateOrUpdateAsync<VirtualMachine>;
}
