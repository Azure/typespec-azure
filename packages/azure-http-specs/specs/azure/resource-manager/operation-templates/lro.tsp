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

@resource("lroResources")
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
    Service returns "Azure-AsyncOperation" on initial request.
    final-state-via: Azure-AsyncOperation
    
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
    Expected response header: Azure-AsyncOperation={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/operations/create_or_replace
    
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
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_create/aao
    
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_create/aao",
      "name": "aao",
      "status" : "InProgress"
    }
    ```
    
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_create/aao
    
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_create/aao",
      "name": "aao",
      "status" : "Succeeded"
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
  createOrReplace is ArmResourceCreateOrReplaceAsync<LroResource>;

  #suppress "deprecated" "legacy"
  #suppress "@azure-tools/typespec-azure-resource-manager/lro-location-header" "legacy"
  @scenario
  @scenarioDoc("""
    Resource DELETE operation.
    Service returns both Location and Azure-AsyncOperation header on initial request.
    final-state-via: location
    
    Expected verb: DELETE
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/lroResources/lro
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 202
    Expected response headers: 
      - Azure-AsyncOperation={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_delete/aao
      - Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/lro_delete/location
    Expected response body:
    ```json
    {
      "id": "delete",
      "status": "InProgress"
    }
    ```
    
    Whether you do polling through AAO, Location or combined, first one will respond with provisioning state "InProgress", second one with "Succeeded".
    
    Location first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_delete/location
    
    Expected status code: 202
    Expected response body:
    ```json
    {
      "id": "location",
      "status": "InProgress"
    }
    ```
    
    Location second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_delete/location
    
    Expected status code: 204
    
    AAO first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_delete/aao
    
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_delete/aao",
      "name": "aao",
      "status" : "InProgress"
    }
    ```
    
    AAO second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_delete/aao
    
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_delete/aao",
      "name": "aao",
      "status" : "Succeeded"
    }
    ```
    """)
  @useFinalStateVia("location")
  delete is ArmResourceDeleteWithoutOkAsync<
    LroResource,
    LroHeaders = ArmCombinedLroHeaders & Azure.Core.Foundations.RetryAfterHeader
  >;
}
