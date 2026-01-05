import "@typespec/versioning";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/spector";
import "./shared-models.tsp";

using TypeSpec.Versioning;
using Spector;

/**
 * Storage Client
 */
@armProviderNamespace("Microsoft.Storage")
@service(#{ title: "Azure Storage resource management API." })
@versioned(Versions)
namespace Azure.ResourceManager.MultiServiceSharedModels.Storage;

/**
 * The available API versions.
 */
enum Versions {
  /**
   * The 2025-02-01 API version.
   */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
  v2025_02_01: "2025-02-01",
}

/**
 * Storage account resource.
 */
model StorageAccount is Azure.ResourceManager.TrackedResource<StorageAccountProperties> {
  ...ResourceNameParameter<
    Resource = StorageAccount,
    KeyName = "accountName",
    SegmentName = "storageAccounts",
    NamePattern = ""
  >;
}

/**
 * Storage account properties.
 */
model StorageAccountProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;

  /**
   * Shared metadata for the storage account.
   */
  metadata?: SharedMetadata;
}

@armResourceOperations
interface StorageAccounts {
  /**
   * Gets information about a storage account.
   */
  @scenario
  @scenarioDoc("""
    Test that a client can expose operations from multiple services with shared models. This operation should be called like this: `client.storageAccounts.get(...)`.
    
    GET a Storage Account.
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/account1
    Expected query parameter: api-version=2025-02-01
    
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/account1",
      "name": "account1",
      "type": "Microsoft.Storage/storageAccounts",
      "location": "westus",
      "properties": {
        "provisioningState": "Succeeded",
        "metadata": {
          "createdAt": "2025-01-02T00:00:00Z",
          "createdBy": "admin@example.com",
          "tags": {
            "department": "engineering"
          }
        }
      }
    }
    ```
    """)
  get is ArmResourceRead<StorageAccount>;

  /**
   * Creates or updates a storage account.
   */
  @scenario
  @scenarioDoc("""
    Test that a client can expose operations from multiple services with shared models. This operation should be called like this: `client.storageAccounts.createOrUpdate(...)`.
    
    PUT (create or update) a Storage Account.
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/account1
    Expected query parameter: api-version=2025-02-01
    Expected request body:
    ```json
    {
      "location": "westus",
      "properties": {
        "metadata": {
          "createdBy": "admin@example.com",
          "tags": {
            "department": "engineering"
          }
        }
      }
    }
    ```
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/account1",
      "name": "account1",
      "type": "Microsoft.Storage/storageAccounts",
      "location": "westus",
      "properties": {
        "provisioningState": "Succeeded",
        "metadata": {
          "createdAt": "2025-01-02T00:00:00Z",
          "createdBy": "admin@example.com",
          "tags": {
            "department": "engineering"
          }
        }
      }
    }
    ```
    """)
  createOrUpdate is ArmResourceCreateOrUpdateAsync<StorageAccount>;
}
