import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/spector";

using Http;
using Rest;
using Versioning;
using Azure.Core;
using Azure.ResourceManager;
using OpenAPI;
using Spector;

namespace Azure.ResourceManager.CommonProperties;

@resource("armResourceIdentifierResources")
model ArmResourceIdentifierResource is TrackedResource<ArmResourceIdentifierResourceProperties> {
  @key("armResourceIdentifierResourceName")
  @path
  @segment("armResourceIdentifierResources")
  @doc("arm resource name for path")
  @pattern("^[A-Za-z0-9]([A-Za-z0-9-_.]{0,62}[A-Za-z0-9])?$")
  name: string;
}

@doc("ArmResourceIdentifier Resource Properties.")
model ArmResourceIdentifierResourceProperties {
  @visibility(Lifecycle.Read)
  @doc("The status of the last operation.")
  provisioningState: ResourceProvisioningState;

  @doc("A basic ARM resource identifier without type or scopes.")
  simpleArmId: armResourceIdentifier;

  @doc("An ARM resource identifier with type only.")
  armIdWithType: armResourceIdentifier<[
    {
      type: "Microsoft.Network/virtualNetworks";
    }
  ]>;

  @doc("An ARM resource identifier with type and scopes.")
  armIdWithTypeAndScope: armResourceIdentifier<[
    {
      type: "Microsoft.Network/virtualNetworks";
      scopes: ["Tenant", "ResourceGroup"];
    }
  ]>;

  @doc("An ARM resource identifier with all scopes.")
  armIdWithAllScopes: armResourceIdentifier<[
    {
      type: "Microsoft.Compute/virtualMachines";
      scopes: ["Tenant", "Subscription", "ResourceGroup", "ManagementGroup", "Extension"];
    }
  ]>;
}

@armResourceOperations
interface ArmResourceIdentifiers {
  @scenario
  @scenarioDoc("""
    Resource GET operation.
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/armResourceIdentifierResources/armId
    Expected query parameter: api-version=2023-12-01-preview
    
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/armResourceIdentifierResources/armId",
      "location": "eastus",
      "name": "armId",
      "type": "Azure.ResourceManager.CommonProperties/armResourceIdentifierResources",
      "properties": {
        "provisioningState": "Succeeded",
        "simpleArmId": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/myVnet",
        "armIdWithType": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/myVnet",
        "armIdWithTypeAndScope": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/myVnet",
        "armIdWithAllScopes": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/myVm"
      }
    }
    ```
    """)
  get is ArmResourceRead<ArmResourceIdentifierResource>;

  @scenario
  @scenarioDoc("""
    Resource PUT operation.
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/armResourceIdentifierResources/armId
    Expected query parameter: api-version=2023-12-01-preview
    Expected request body:
    ```json
    {
      "location": "eastus",
      "properties": {
        "simpleArmId": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/myVnet",
        "armIdWithType": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/myVnet",
        "armIdWithTypeAndScope": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/myVnet",
        "armIdWithAllScopes": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/myVm"
      }
    }
    ```
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.CommonProperties/armResourceIdentifierResources/armId",
      "location": "eastus",
      "name": "armId",
      "type": "Azure.ResourceManager.CommonProperties/armResourceIdentifierResources",
      "properties": {
        "provisioningState": "Succeeded",
        "simpleArmId": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/myVnet",
        "armIdWithType": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/myVnet",
        "armIdWithTypeAndScope": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/myVnet",
        "armIdWithAllScopes": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Compute/virtualMachines/myVm"
      }
    }
    ```
    """)
  createOrReplace is ArmResourceCreateOrReplaceSync<ArmResourceIdentifierResource>;
}
