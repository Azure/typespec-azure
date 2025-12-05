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
@armProviderNamespace("Microsoft.Compute")
@service(#{ title: "Azure Compute resource management API." })
@versioned(Versions)
namespace Microsoft.ComputeDisk;

/**
 * The available API versions.
 */
enum Versions {
  /**
   * The 2024-03-02 API version.
   */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2024_03_02: "2024-03-02",

  /**
   * The 2025-01-02 API version.
   */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2025_01_02: "2025-01-02",
}

/**
 * Disk resource.
 */
model Disk is Azure.ResourceManager.TrackedResource<DiskProperties> {
  ...ResourceNameParameter<
    Resource = Disk,
    KeyName = "diskName",
    SegmentName = "disks",
    NamePattern = ""
  >;
}

/**
 * Disk resource properties.
 */
model DiskProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@armResourceOperations
interface Disks {
  /**
   * Gets information about a disk.
   */
  get is ArmResourceRead<Disk>;

  /**
   * Creates or updates a disk.
   */
  createOrUpdate is ArmResourceCreateOrUpdateAsync<Disk>;
}
