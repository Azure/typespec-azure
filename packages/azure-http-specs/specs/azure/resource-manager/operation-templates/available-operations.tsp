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

@scenario("ListAvailableOperations")
@scenarioDoc("""
    Resource GET operation.
    Expected path: /providers/Azure.ResourceManager.Models.Resources/operations
    Expected query parameter: api-version=2023-12-01-preview
    Expected response body:
    ```json
    {
      "value": [{
        "name": "Microsoft.Compute/virtualMachines/write",
        "isDataAction": false,
        "display": {
          "provider": "Microsoft Compute",
          "resource": "Virtual Machines",
          "operation": "Create or Update Virtual Machine.",
          "description": "Add or modify virtual machines.",
        },
        "origin": "user,system",
        "actionType": "Internal",
      }]
    }
    ```
  """)
interface Operations extends Azure.ResourceManager.Operations {}
