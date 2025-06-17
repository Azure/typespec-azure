import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/spector";

using Http;
using Rest;
using Azure.Core;
using Azure.ResourceManager;
using OpenAPI;
using Spector;

namespace Azure.ResourceManager.OperationTemplates;

@resource("widgets")
model Widget is TrackedResource<WidgetProperties> {
  ...ResourceNameParameter<Widget>;
}

model WidgetProperties {
  @doc("The name of the widget.")
  name?: string;

  @doc("The description of the widget.")
  description?: string;

  @doc("The provisioning state of the widget.")
  @visibility(Lifecycle.Read)
  provisioningState?: string;
}

// Request models for optional body scenarios
model UpdateRequest {
  @doc("The name to update.")
  name?: string;

  @doc("The description to update.")
  description?: string;
}

model ActionRequest {
  @doc("The action type to perform.")
  actionType?: string;

  @doc("Additional action parameters.")
  parameters?: string;
}

model ActionResult {
  @doc("The result of the action.")
  result: string;
}

@armResourceOperations
interface OptionalBody {
  @scenario
  @scenarioDoc("""
    Resource GET operation to retrieve a widget.
    
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/widgets/widget1
    Expected query parameter: api-version=2023-12-01-preview
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/widgets/widget1",
      "name": "widget1",
      "type": "Azure.ResourceManager.OperationTemplates/widgets",
      "location": "eastus",
      "properties": {
        "name": "widget1",
        "description": "A test widget",
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
  get is ArmResourceRead<Widget>;

  @scenario
  @scenarioDoc("""
    Resource PATCH operation using Legacy.CustomPatchSync with no request body.
    This tests the optional body functionality where the request body is not sent.
    
    Expected verb: PATCH  
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/widgets/widget1
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body: None (empty body)
    Expected status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/widgets/widget1",
      "name": "widget1",
      "type": "Azure.ResourceManager.OperationTemplates/widgets",
      "location": "eastus",
      "properties": {
        "name": "widget1",
        "description": "A test widget",
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
  patch is Azure.ResourceManager.Legacy.CustomPatchSync<
    Widget,
    UpdateRequest,
    OptionalRequestBody = true
  >;

  @scenario
  @scenarioDoc("""
    Resource POST action operation using ArmResourceActionSync with no request body.
    This tests the optional body functionality where the request body is not sent.
    
    Expected verb: POST
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/widgets/widget1/actionWithoutBody
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body: None (empty body)
    Expected status code: 200
    Expected response body:
    ```json
    {
      "result": "Action completed successfully"
    }
    ```
    """)
  actionWithoutBody is ArmResourceActionSync<
    Widget,
    ActionRequest,
    ActionResult,
    OptionalRequestBody = true
  >;
}
