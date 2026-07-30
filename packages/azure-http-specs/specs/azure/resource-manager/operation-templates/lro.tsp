import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";

using Rest;
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
  @visibility(Lifecycle.Read)
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

// Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/cost-management/resource-manager/Microsoft.CostManagement/CostManagement/GenerateDetailedCostReportOperationResult.tsp#L33-L39
model CostReport is ExtensionResource<CostReportProperties> {
  ...ResourceNameParameter<
    Resource = CostReport,
    KeyName = "operationId",
    SegmentName = "costReports",
    NamePattern = ""
  >;
}

model CostReportProperties {
  @doc("The download URL for the cost report.")
  downloadUrl?: url;

  @doc("The provisioning state of the cost report.")
  @visibility(Lifecycle.Read)
  provisioningState?: string;
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
    Expected response header: Azure-AsyncOperation={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao
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
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao
    
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao",
      "name": "lro_create_aao",
      "startTime": "2024-11-08T01:41:53.5508583+00:00",
      "status" : "InProgress"
    }
    ```
    
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao
    
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao",
      "name": "lro_create_aao",
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
      "name": "order1",
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
    ```
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
      - Azure-AsyncOperation={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao
      - Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/operations/lro_post_location
    Expected no response body
    
    Whether you do polling through AAO, Location or combined, first one will respond with provisioning state "InProgress", second one with "Succeeded".
    
    AAO first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao",
      "name": "lro_post_aao",
      "status" : "InProgress",
      "startTime": "2024-11-08T01:41:53.5508583+00:00"
    }
    ```
    
    AAO second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao",
      "name": "lro_post_aao",
      "status" : "Succeeded",
      "startTime": "2024-11-08T01:41:53.5508583+00:00",
      "endTime": "2024-11-08T01:42:41.5354192+00:00"
    }
    ```
    
    Location first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_location
    Expected status code: 202
    Expected no response body
    
    Location second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_location
    Expected status code: 200
    Expected response body:
    ```json
    {
      "content": "order1,product1,1"
    }
    ```
    """)
  export is ArmResourceActionAsync<
    Order,
    ExportRequest,
    ExportResult,
    LroHeaders = ArmCombinedLroHeaders<FinalResult = ExportResult> &
      Azure.Core.Foundations.RetryAfterHeader
  >;

  @scenario
  @scenarioDoc("""
    Resource DELETE operation.
    Service returns both Location header on initial request.
    
    Expected verb: DELETE
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/orders/order1
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 202
    Expected response header: Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/lro_delete_location
    Expected no response body
    
    Location first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/lro_delete_location
    Expected status code: 202
    Expected no response body
    
    Location second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/lro_delete_location
    Expected status code: 204
    Expected no response body
    """)
  delete is ArmResourceDeleteWithoutOkAsync<Order>;

  @scenario
  @scenarioDoc("""
    Subscription-scoped POST operation returning an array.
    Service returns both Location and Azure-AsyncOperation header on initial request.
    final-state-via: location
    
    Expected verb: POST
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/exportArray
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body:
    ```json
    {
      "format": "csv"
    }
    ```
    Expected response status code: 202
    Expected response headers: 
      - Azure-AsyncOperation={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao
      - Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_location
    Expected no response body
    
    Whether you do polling through AAO, Location or combined, first one will respond with provisioning state "InProgress", second one with "Succeeded".
    
    AAO first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao",
      "name": "lro_exportarray_aao",
      "status" : "InProgress",
      "startTime": "2024-11-08T01:41:53.5508583+00:00"
    }
    ```
    
    AAO second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao",
      "name": "lro_exportarray_aao",
      "status" : "Succeeded",
      "startTime": "2024-11-08T01:41:53.5508583+00:00",
      "endTime": "2024-11-08T01:42:41.5354192+00:00"
    }
    ```
    
    Location first poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_location
    Expected status code: 202
    Expected no response body
    
    Location second poll.
    Expected verb: GET
    Expected URL: {endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_location
    Expected status code: 200
    Expected response body:
    ```json
    [
      {"content": "order1,product1,1"},
      {"content": "order2,product2,2"}
    ]
    ```
    """)
  exportArray is ArmProviderActionAsync<
    ExportRequest,
    ExportResult[],
    SubscriptionActionScope,
    {},
    LroHeaders = ArmCombinedLroHeaders<FinalResult = ExportResult[]> &
      Azure.Core.Foundations.RetryAfterHeader
  >;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing markAsLro on GET"
  #suppress "@azure-tools/typespec-azure-resource-manager/lro-location-header" "Testing markAsLro on GET"
  @scenario
  @scenarioDoc("""
    Resource GET operation that returns a long-running operation.
    Uses Extension.Read with @markAsLro, which returns 200 or 202.
    The Location header points back to the same resource URL (matches real service behavior).
    
    Step 1: Initial GET Request (returns 202 Accepted)
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/costReports/report1
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 202
    Expected response header: Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/costReports/report1
    
    Step 2: Polling Request (returns 202 Accepted)
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/costReports/report1
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 202
    Expected response header: Location={endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/costReports/report1
    
    Step 3: Final Polling Request (returns 200 OK with result)
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/costReports/report1
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/costReports/report1",
      "name": "report1",
      "type": "Azure.ResourceManager.OperationTemplates/costReports",
      "properties": {
        "downloadUrl": "https://storage.blob.core.windows.net/reports/report1.csv",
        "provisioningState": "Succeeded"
      },
      "systemData": {
        "createdBy": "AzureSDK",
        "createdByType": "User",
        "createdAt": <any date>,
        "lastModifiedBy": "AzureSDK",
        "lastModifiedAt": <any date>,
        "lastModifiedByType": "User"
      }
    }
    ```
    """)
  @Azure.ClientGenerator.Core.Legacy.markAsLro
  getLro is Extension.Read<
    Extension.ScopeParameter,
    CostReport,
    Response = ArmResponse<CostReport> | ArmAcceptedResponse,
    Error = ErrorResponse
  >;
}
