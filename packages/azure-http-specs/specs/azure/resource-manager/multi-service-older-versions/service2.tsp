import "@typespec/versioning";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/spector";

using TypeSpec.Versioning;
using Spector;

/**
 * Compute Disk Client
 */
@armProviderNamespace("Microsoft.Compute")
@service(#{ title: "Azure Compute Disk resource management API." })
@versioned(Versions)
namespace Azure.ResourceManager.MultiServiceOlderVersions.ComputeDisk;

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
    SegmentName = "disksOld",
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
  @scenario
  @scenarioDoc("""
    Test that a client can expose operations from multiple services using older API versions. This operation should be called like this: `client.disks.get(...)`.
    
    GET a Disk resource.
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/disksOld/disk-old1
    Expected query parameter: api-version=2024-03-02
    
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/disksOld/disk-old1",
      "name": "disk-old1",
      "type": "Microsoft.Compute/disksOld",
      "location": "eastus",
      "properties": {
        "provisioningState": "Succeeded"
      }
    }
    ```
    """)
  get is ArmResourceRead<Disk>;

  /**
   * Creates or updates a disk.
   */
  @scenario
  @scenarioDoc("""
    Test that a client can expose operations from multiple services using older API versions. This operation should be called like this: `client.disks.createOrUpdate(...)`.
    
    PUT (create or update) a Disk resource.
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/disksOld/disk-old1
    Expected query parameter: api-version=2024-03-02
    Expected request body:
    ```json
    {
      "location": "eastus",
      "properties": {}
    }
    ```
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/disksOld/disk-old1",
      "name": "disk-old1",
      "type": "Microsoft.Compute/disksOld",
      "location": "eastus",
      "properties": {
        "provisioningState": "Succeeded"
      }
    }
    ```
    """)
  createOrUpdate is ArmResourceCreateOrUpdateAsync<Disk>;
}
