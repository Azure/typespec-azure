import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/spector";

using Rest;
using Spector;
using Azure.ResourceManager;

namespace Azure.ResourceManager.OperationTemplates;

@resource("products")
model Product is TrackedResource<ProductProperties> {
  ...ResourceNameParameter<Product>;
}

model ProductProperties {
  @doc("The product ID.")
  productId?: string;

  @doc("The provisioning state of the product.")
  @visibility(Lifecycle.Read)
  provisioningState?: string;
}

model ProductListResult {
  @pageItems
  value: Product[];

  @nextLink
  nextLink?: url;
}

@armResourceOperations
interface LroPaging {
  @scenario
  @scenarioDoc("""
    Resource POST operation that returns a LRO with paging.
    
    Step 1: Initial Request
    Expected verb: POST
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/products/default/postPagingLro
    Expected query parameter: api-version=2023-12-01-preview
    Expected response: 202 Accepted with Location header.
    
    Step 2: Polling Request
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_location
    Expected query parameter: api-version=2023-12-01-preview
    Expected response: 202 Accepted.
    
    Step 3: Final Result Request
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_location
    Expected query parameter: api-version=2023-12-01-preview
    Expected response: 200 OK with a paged result. The response body contains a "nextLink" field.
    Expected response body:
    ```json
    {
      "value": [
        {
          "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/products/product1",
          "name": "product1",
          "type": "Azure.ResourceManager.OperationTemplates/products",
          "location": "eastus",
          "properties": {
            "provisioningState": "Succeeded",
            "productId": "product1"
          }
        }
      ],
      "nextLink": "..."
    }
    ```
    
    Step 4: Next Page Request
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_location/nextPage
    Expected query parameter: api-version=2023-12-01-preview
    Expected response: 200 OK with the second page of results.
    Expected response body:
    ```json
    {
      "value": [
        {
          "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/products/product2",
          "name": "product2",
          "type": "Azure.ResourceManager.OperationTemplates/products",
          "location": "eastus",
          "properties": {
            "provisioningState": "Succeeded",
            "productId": "product2"
          }
        }
      ]
    }
    ```
    """)
  @list
  postPagingLro is ArmResourceActionAsyncBase<
    Product,
    void,
    ArmResponse<ProductListResult> | ArmAcceptedLroResponse<
      "Accepted. The header contains 'Location' header which can be used to monitor the progress of the operation.",
      ArmLroLocationHeader<FinalResult = ProductListResult>
    >,
    BaseParameters = Azure.ResourceManager.Foundations.DefaultBaseParameters<Product>
  >;
}
