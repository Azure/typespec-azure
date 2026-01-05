import "@typespec/versioning";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/spector";
import "./shared-models.tsp";

using TypeSpec.Versioning;
using Spector;

/**
 * Compute Client
 */
@armProviderNamespace("Microsoft.Compute")
@service(#{ title: "Azure Compute resource management API." })
@versioned(Versions)
namespace Azure.ResourceManager.MultiServiceSharedModels.Compute;

/**
 * The available API versions.
 */
enum Versions {
  /**
   * The 2025-05-01 API version.
   */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2025_05_01: "2025-05-01",
}

/**
 * Describes a Virtual Machine.
 */
model VirtualMachine is Azure.ResourceManager.TrackedResource<VirtualMachineProperties> {
  ...ResourceNameParameter<
    Resource = VirtualMachine,
    KeyName = "vmName",
    SegmentName = "virtualMachinesShared",
    NamePattern = ""
  >;
}

model VirtualMachineProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;

  /**
   * Shared metadata for the virtual machine.
   */
  metadata?: SharedMetadata;
}

@armResourceOperations
interface VirtualMachines {
  /**
   * Retrieves information about the model view or the instance view of a virtual machine.
   */
  @scenario
  @scenarioDoc("""
    Test that a client can expose operations from multiple services with shared models. This operation should be called like this: `client.virtualMachines.get(...)`.
    
    GET a Virtual Machine.
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachinesShared/vm-shared1
    Expected query parameter: api-version=2025-05-01
    
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachinesShared/vm-shared1",
      "name": "vm-shared1",
      "type": "Microsoft.Compute/virtualMachinesShared",
      "location": "eastus",
      "properties": {
        "provisioningState": "Succeeded",
        "metadata": {
          "createdAt": "2025-01-01T00:00:00Z",
          "createdBy": "user@example.com",
          "tags": {
            "environment": "production"
          }
        }
      }
    }
    ```
    """)
  get is ArmResourceRead<VirtualMachine>;

  /**
   * The operation to create or update a virtual machine. Please note some properties can be set only during virtual machine creation.
   */
  @scenario
  @scenarioDoc("""
    Test that a client can expose operations from multiple services with shared models. This operation should be called like this: `client.virtualMachines.createOrUpdate(...)`.
    
    PUT (create or update) a Virtual Machine.
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachinesShared/vm-shared1
    Expected query parameter: api-version=2025-05-01
    Expected request body:
    ```json
    {
      "location": "eastus",
      "properties": {
        "metadata": {
          "createdBy": "user@example.com",
          "tags": {
            "environment": "production"
          }
        }
      }
    }
    ```
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachinesShared/vm-shared1",
      "name": "vm-shared1",
      "type": "Microsoft.Compute/virtualMachinesShared",
      "location": "eastus",
      "properties": {
        "provisioningState": "Succeeded",
        "metadata": {
          "createdAt": "2025-01-01T00:00:00Z",
          "createdBy": "user@example.com",
          "tags": {
            "environment": "production"
          }
        }
      }
    }
    ```
    """)
  createOrUpdate is ArmResourceCreateOrUpdateAsync<VirtualMachine>;
}
