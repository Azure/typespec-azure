import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/spector";

using Rest;
using Spector;

namespace Azure.ResourceManager.OperationTemplates;

// Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/dynatrace/Dynatrace.Management/MonitorResource.tsp#L77-L83

@resource("monitors")
model Monitor is TrackedResource<MonitorProperties> {
  ...ResourceNameParameter<Monitor>;
}

model MonitorProperties {
  @doc("The status of the monitor.")
  status?: string;

  @doc("The provisioning state.")
  @visibility(Lifecycle.Read)
  provisioningState?: string;
}

model LogStatusRequest {
  @doc("Filter for the monitored resources.")
  filter?: string;
}

model MonitoredResource {
  @doc("The resource ID.")
  id: string;

  @doc("Whether metrics are being sent.")
  sendingMetrics?: boolean;
}

model MonitoredResourceListResponse {
  @doc("The list of monitored resources.")
  @pageItems
  value: MonitoredResource[];

  @doc("The link to the next page of results.")
  nextLink?: url;
}

// Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace/client.tsp#L286

@parentResource(Monitor)
model Collection is ProxyResource<CollectionProperties> {
  ...ResourceNameParameter<
    Resource = Collection,
    KeyName = "collectionId",
    SegmentName = "collections",
    NamePattern = ""
  >;
}

model CollectionProperties {
  @doc("The display name of the collection.")
  displayName?: string;
}

model CollectionsList {
  @doc("The list of collections.")
  value: Collection[];
}

@armResourceOperations
interface Paging {
  get is ArmResourceRead<Monitor>;

  @scenario
  @scenarioDoc("""
    Resource POST action returning pageable results.
    This tests a POST action with @list that returns pageable results (not an LRO).
    
    Step 1: Initial POST Request (returns first page)
    Expected verb: POST
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/monitors/monitor1/postActionPaging
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body:
    ```json
    {
      "filter": "status eq 'active'"
    }
    ```
    Expected response status code: 200
    Expected response body:
    ```json
    {
      "value": [
        {
          "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/vm1",
          "sendingMetrics": true
        }
      ],
      "nextLink": "{endpoint}/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/monitors/monitor1/postActionPaging/nextPage?api-version=2023-12-01-preview"
    }
    ```
    
    Step 2: Next Page Request
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/monitors/monitor1/postActionPaging/nextPage
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 200
    Expected response body:
    ```json
    {
      "value": [
        {
          "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/vm2",
          "sendingMetrics": false
        }
      ]
    }
    ```
    """)
  @list
  postActionPaging is ArmResourceActionSync<
    Monitor,
    LogStatusRequest,
    ArmResponse<MonitoredResourceListResponse>,
    OptionalRequestBody = true
  >;

  #suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing markAsPageable"
  #suppress "@azure-tools/typespec-client-generator-core/mark-as-pageable-ineffective" "Testing markAsPageable"
  @scenario
  @scenarioDoc("""
    List operation using ArmListSinglePageByParent with @markAsPageable.
    The response uses a custom list model (CollectionsList) wrapping
    the resource array.
    
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/monitors/monitor1/collections
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 200
    Expected response body:
    ```json
    {
      "value": [
        {
          "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/monitors/monitor1/collections/collection1",
          "name": "collection1",
          "type": "Azure.ResourceManager.OperationTemplates/monitors/collections",
          "properties": {
            "displayName": "Test Collection"
          }
        },
        {
          "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/monitors/monitor1/collections/collection2",
          "name": "collection2",
          "type": "Azure.ResourceManager.OperationTemplates/monitors/collections",
          "properties": {
            "displayName": "Another Collection"
          }
        }
      ]
    }
    ```
    """)
  @Azure.ClientGenerator.Core.Legacy.markAsPageable
  markAsPageable is Azure.ResourceManager.Legacy.ArmListSinglePageByParent<
    Collection,
    Response = ArmResponse<CollectionsList>,
    Error = ErrorResponse
  >;
}
