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

namespace Azure.ResourceManager.OperationTemplates;

@resource("lroResource")
model LroResource is TrackedResource<LroResourceProperties> {
  ...ResourceNameParameter<LroResource>;
}

model LroResourceProperties {
  @doc("The description of the resource.")
  description?: string;
}

@armResourceOperations
interface Lro {
  @scenario
  @scenarioDoc("""
    Resource PUT operation.
    final-state-via: location
    
    Expected verb: PUT
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/lroResources/lro
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body:
    ```json
    {
      "location": "eastus",
      "properties": {
        "description": "valid"
      }
    }
    ```
    
    Expected status code: 201
    Expected response header: Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/operations/create_or_replace
    
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/lroResources/lro",
      "name": "top",
      "type": "topLevel",
      "location": "eastus",
      "properties": {
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
    
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/operations/create_or_replace
    
    Expected status code: 202
    Expected response body:
    ```json
    {
      "id": "create_or_replace",
      "status": "InProgress"
    }
    ```
    
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/operations/create_or_replace
    
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "create_or_replace",
      "status": "Succeeded"
    }
    ```
    
    (The last GET call on resource URL is optional)
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/lroResources/lro
    
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/lroResources/lro",
      "name": "top",
      "type": "topLevel",
      "location": "eastus",
      "properties": {
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
    """)
  createOrReplace is ArmResourceCreateOrReplaceAsync<
    LroResource,
    LroHeaders = ArmLroLocationHeader & Azure.Core.Foundations.RetryAfterHeader
  >;

  #suppress "deprecated" "legacy"
  #suppress "@azure-tools/typespec-azure-resource-manager/lro-location-header" "legacy"
  @scenario
  @scenarioDoc("""
    Resource DELETE operation.
    Service returns both Location and Azure-Async-Operation header.
    final-state-via: azure-async-operation
    
    Expected verb: DELETE
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/lroResources/lro
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 202
    Expected response headers: 
      - Azure-Async-Operation={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/operations/delete
      - Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/operations/delete
    Expected response body:
    ```json
    {
      "id": "delete",
      "status": "InProgress"
    }
    ```
    
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/operations/delete
    
    Expected status code: 202
    Expected response body:
    ```json
    {
      "id": "delete",
      "status": "InProgress"
    }
    ```
    
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/operations/delete
    
    Expected status code: 204
    """)
  @useFinalStateVia("azure-async-operation")
  delete is ArmResourceDeleteWithoutOkAsync<
    LroResource,
    LroHeaders = Azure.Core.Foundations.RetryAfterHeader & ArmCombinedLroHeaders
  >;
}
