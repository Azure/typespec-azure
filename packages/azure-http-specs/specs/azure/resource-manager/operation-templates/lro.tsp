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

@resource("orders")
model Order is TrackedResource<OrderProperties> {
  ...ResourceNameParameter<Order>;
}

model OrderProperties {
  @doc("The product ID of the order.")
  productId: string;

  @doc("Amount of the product.")
  amount: int32;

  @doc("The provisioning state of the product.")
  @visibility("read")
  provisioningState?: string;
}

model ExportRequest {
  @doc("Format of the exported order.")
  format: string;
}

model ExportResult {
  @doc("Content of the exported order.")
  content: string;
}

@armResourceOperations
interface Lro {
  @scenario
  @scenarioDoc("""
    Resource PUT operation.
    Service returns "Azure-AsyncOperation" on initial request.
    final-state-via: Azure-AsyncOperation
    
    Expected verb: PUT
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/orders/order1
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body:
    ```json
    {
      "location": "eastus",
      "properties": {
        "productId": "product1",
        "amount": 1
      }
    }
    ```
    Expected status code: 201
    Expected response header: Azure-AsyncOperation={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_create/aao
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/orders/order1",
      "name": "order1",
      "type": "Azure.ResourceManager.Resources/orders",
      "location": "eastus",
      "properties": {
        "productId": "product1",
        "amount": 1,
        "provisioningState": "InProgress"
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
      "startTime": "2024-11-08T01:41:53.5508583+00:00",
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
      "status" : "Succeeded",
      "startTime": "2024-11-08T01:41:53.5508583+00:00",
      "endTime": "2024-11-08T01:42:41.5354192+00:00"
    }
    ```
    
    Last get call on resource URL
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/orders/order1
    
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/orders/order1",
      "name": "lro",
      "type": "Azure.ResourceManager.Resources/orders",
      "location": "eastus",
      "properties": {
        "productId": "product1",
        "amount": 1,
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
  createOrReplace is ArmResourceCreateOrReplaceAsync<Order>;

  @scenario
  @scenarioDoc("""
    Resource POST operation.
    Service returns both Location and Azure-AsyncOperation header on initial request.
    final-state-via: location
    
    Expected verb: POST
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/orders/order1/export
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body:
    ```json
    {
      "format": "csv"
    }
    ```
    Expected response status code: 202
    Expected response headers: 
      - Azure-AsyncOperation={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_post/aao
      - Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/lro_post/location
    Expected no response body
    
    Whether you do polling through AAO, Location or combined, first one will respond with provisioning state "InProgress", second one with "Succeeded".
    
    AAO first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_post/aao
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_post/aao",
      "name": "aao",
      "status" : "InProgress",
      "startTime": "2024-11-08T01:41:53.5508583+00:00"
    }
    ```
    
    AAO second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_post/aao
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_post/aao",
      "name": "aao",
      "status" : "Succeeded",
      "startTime": "2024-11-08T01:41:53.5508583+00:00",
      "endTime": "2024-11-08T01:42:41.5354192+00:00"
    }
    ```
    
    Location first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_post/location
    Expected status code: 202
    Expected no response body
    
    Location second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_post/location
    Expected status code: 200
    Expected response body:
    ```json
    {
      "content": "order1,product1,1"
    }
    ```
    """)
  @useFinalStateVia("location")
  export is ArmResourceActionAsync<
    Order,
    ExportRequest,
    ExportResult,
    LroHeaders = ArmCombinedLroHeaders & Azure.Core.Foundations.RetryAfterHeader
  >;

  #suppress "deprecated" "legacy"
  #suppress "@azure-tools/typespec-azure-resource-manager/lro-location-header" "legacy"
  @scenario
  @scenarioDoc("""
    Resource DELETE operation.
    Service returns both Location header on initial request.
    
    Expected verb: DELETE
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/orders/order1
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 202
    Expected response header: Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/lro_delete/location
    Expected no response body
    
    Location first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_delete/location
    Expected status code: 202
    Expected no response body
    
    Location second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/locations/eastus/lro_delete/location
    Expected status code: 204
    Expected no response body
    """)
  delete is ArmResourceDeleteWithoutOkAsync<Order>;
}
