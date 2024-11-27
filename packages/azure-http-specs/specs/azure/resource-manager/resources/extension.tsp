import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/spector";

using TypeSpec.Http;
using TypeSpec.Rest;
using Azure.Core;
using Azure.ResourceManager;
using TypeSpec.OpenAPI;
using Spector;

namespace Azure.ResourceManager.Resources;

model ExtensionsResource is ExtensionResource<ExtensionsResourceProperties> {
  ...ResourceNameParameter<ExtensionsResource>;
}

/** ExtensionsResource properties */
model ExtensionsResourceProperties {
  @doc("The description of the resource.")
  description?: string;

  /** The status of the last operation. */
  @visibility("read")
  provisioningState?: ProvisioningState;
}

/** The interface of extensions resources,
 * it contains 4 kinds of URLs (resource, resource group, subscription and tenant)
 */
@armResourceOperations
interface ExtensionsResources {
  @scenario
  @scenarioDoc("""
      Resource GET operation for tenant level extension resource.
      Expected path: /providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected response body:
      ```json
      {
        "id": "/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    
      Resource GET operation for subscription level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected response body:
      ```json
      {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    
      Resource GET operation for resource group level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected response body:
      ```json
      {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    
      Resource GET operation for resource level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected response body:
      ```json
      {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    """)
  get is ArmResourceRead<ExtensionsResource>;

  @scenario
  @scenarioDoc("""
      Resource PUT operation for tenant level extension resource.
      Expected path: /providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected request body:
      ```json
      {
        "properties":{
          "description": "valid",
      }
      ```
    
      Expected response body:
      ```json
      {
        "id": "/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    
      Resource PUT operation for subscription level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected request body:
      ```json
      {
        "properties":{
          "description": "valid",
      }
      ```
    
      Expected response body:
      ```json
      {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    
      Resource PUT operation for resource group level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected request body:
      ```json
      {
        "properties":{
          "description": "valid",
      }
      ```
    
      Expected response body:
      ```json
      {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    
      Resource PUT operation for resource level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected request body:
      ```json
      {
        "properties":{
          "description": "valid",
      }
      ```
    
      Expected response body:
      ```json
      {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    """)
  createOrUpdate is ArmResourceCreateOrReplaceAsync<ExtensionsResource>;

  @scenario
  @scenarioDoc("""
      Resource Patch operation for tenant level extension resource.
      Expected path: /providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected request body:
      ```json
      {
        "properties":{
          "description": "valid2",
      }
      ```
    
      Expected response body:
      ```json
      {
        "id": "/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid2",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    
      Resource Patch operation for subscription level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected request body:
      ```json
      {
        "properties":{
          "description": "valid2",
      }
      ```
    
      Expected response body:
      ```json
      {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid2",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    
      Resource Patch operation for resource group level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected request body:
      ```json
      {
        "properties":{
          "description": "valid2",
      }
       ```
    
      Expected response body:
      ```json
      {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid2",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    
      Resource Patch operation for resource level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected request body:
      ```json
      {
        "properties":{
          "description": "valid2",
      }
      ```
    
      Expected response body:
      ```json
      {
        "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
        "name": "extension",
        "type": "Azure.ResourceManager.Resources/extensionsResources",
        "properties":{
          "description": "valid2",
          "provisioningState": "Succeeded"
        },
        "systemData": {
          "createdBy": "AzureSDK",
          "createdByType": "User",
          "createdAt": <any date>,
          "lastModifiedBy": "AzureSDK",
          "lastModifiedAt": <any date>,
          "lastModifiedByType": "User",
        }
      }
      ```
    """)
  update is ArmResourcePatchSync<ExtensionsResource, ExtensionsResourceProperties>;

  @scenario
  @scenarioDoc("""
      Resource DELETE operation for tenant level extension resource.
      Expected path: /providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
      Expected response status code: 204
    
      Resource DELETE operation for subscription level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
      Expected response status code: 204
    
      Resource DELETE operation for resource get level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
      Expected response status code: 204
    
      Resource DELETE operation for resource level extension resource.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension
      Expected query parameter: api-version=2023-12-01-preview
      Expected response status code: 204
    """)
  delete is ArmResourceDeleteSync<ExtensionsResource>;

  @scenario
  @scenarioDoc("""
      Resource LIST by tenant level url operation.
      Expected path: /providers/Azure.ResourceManager.Resources/extensionResources
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected response body:
      ```json
      {
        "value": [{
          "id": "/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
          "name": "extension",
          "type": "Azure.ResourceManager.Resources/extensionsResources",
          "properties":{
            "description": "valid",
            "provisioningState": "Succeeded"
          },
          "systemData": {
            "createdBy": "AzureSDK",
            "createdByType": "User",
            "createdAt": <any date>,
            "lastModifiedBy": "AzureSDK",
            "lastModifiedAt": <any date>,
            "lastModifiedByType": "User",
          }
        }]
      }
      ```
    
      Resource LIST by subscription level url operation.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.Resources/extensionResources
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected response body:
      ```json
      {
        "value": [{
          "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
          "name": "extension",
          "type": "Azure.ResourceManager.Resources/extensionsResources",
          "properties":{
            "description": "valid",
            "provisioningState": "Succeeded"
          },
          "systemData": {
            "createdBy": "AzureSDK",
            "createdByType": "User",
            "createdAt": <any date>,
            "lastModifiedBy": "AzureSDK",
            "lastModifiedAt": <any date>,
            "lastModifiedByType": "User",
          }
        }]
      }
      ```
    
      Resource LIST by resource group level url operation.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/extensionResources
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected response body:
      ```json
      {
        "value": [{
          "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
          "name": "extension",
          "type": "Azure.ResourceManager.Resources/extensionsResources",
          "properties":{
            "description": "valid",
            "provisioningState": "Succeeded"
          },
          "systemData": {
            "createdBy": "AzureSDK",
            "createdByType": "User",
            "createdAt": <any date>,
            "lastModifiedBy": "AzureSDK",
            "lastModifiedAt": <any date>,
            "lastModifiedByType": "User",
          }
        }]
      }
      ```
    
      Resource LIST by resource level url operation.
      Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionResources
      Expected query parameter: api-version=2023-12-01-preview
    
      Expected response body:
      ```json
      {
        "value": [{
          "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension",
          "name": "extension",
          "type": "Azure.ResourceManager.Resources/extensionsResources",
          "properties":{
            "description": "valid",
            "provisioningState": "Succeeded"
          },
          "systemData": {
            "createdBy": "AzureSDK",
            "createdByType": "User",
            "createdAt": <any date>,
            "lastModifiedBy": "AzureSDK",
            "lastModifiedAt": <any date>,
            "lastModifiedByType": "User",
          }
        }]
      }
      ```
    """)
  listByParent is ArmResourceListByParent<ExtensionsResource>;
}
