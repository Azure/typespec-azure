import "@typespec/http";
import "@typespec/rest";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-azure-resource-manager";
import "@typespec/spector";

using Rest;
using Spector;
using Azure.ResourceManager;
using TypeSpec.Http;

namespace Azure.ResourceManager.OperationTemplates;

// --- Models for legacy template scenarios ---

@resource("configurations")
model Configuration is TrackedResource<ConfigurationProperties> {
  ...ResourceNameParameter<Configuration>;
}

model ConfigurationProperties {
  @doc("The configuration value.")
  configValue?: string;

  @doc("The provisioning state.")
  @visibility(Lifecycle.Read)
  provisioningState?: string;
}

model DiagnosticInfo {
  @doc("The diagnostic name.")
  name: string;

  @doc("The diagnostic status.")
  status: string;
}

// RoutedOperations alias with custom route override
// Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/web/resource-manager/Microsoft.Web/AppService/AppServiceEnvironmentResource.tsp#L30-L46
alias ConfigRoutedOps = Azure.ResourceManager.Legacy.RoutedOperations<
  {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...ResourceGroupParameter;
  },
  {
    @path
    @segment("configurations")
    @key
    name: string;
  },
  ResourceRoute = #{
    route: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Azure.ResourceManager.OperationTemplates/configurations",
  }
>;

#suppress "@azure-tools/typespec-azure-core/no-legacy-usage" "Testing legacy RoutedOperations and CreateOrReplaceSync"
@armResourceOperations(#{ allowStaticRoutes: true, omitTags: true })
interface Legacy {
  // Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/web/resource-manager/Microsoft.Web/AppService/AppServiceEnvironmentResource.tsp#L30-L46
  @scenario
  @scenarioDoc("""
    GET operation using RoutedOperations with a custom route path override.
    Tests the Legacy.RoutedOperations pattern where the resource path is overridden
    using ResourceRoute, and additional path parameters are added via @route.
    
    Expected verb: GET
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/configurations/default/diagnostics/memory
    Expected query parameter: api-version=2023-12-01-preview
    Expected response status code: 200
    Expected response body:
    ```json
    {
      "name": "memory",
      "status": "healthy"
    }
    ```
    """)
  @get
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Azure.ResourceManager.OperationTemplates/configurations/{name}/diagnostics/{diagnosticName}")
  routedGet is ConfigRoutedOps.ActionSync<
    Configuration,
    void,
    ArmResponse<DiagnosticInfo>,
    Parameters = {
      @path
      @key
      diagnosticName: string;
    }
  >;

  // Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace/Collection.tsp#L38-L44
  #suppress "@azure-tools/typespec-azure-resource-manager/arm-put-operation-response-codes" "Testing legacy CreateOrReplaceSync with single 200 response"
  @scenario
  @scenarioDoc("""
    PUT operation using Legacy.CreateOrReplaceSync with optional request body.
    Tests the pattern where a resource can be created or replaced with an optional body,
    as seen in marketplace Collections.
    
    This tests two sub-scenarios:
    1. With body: PUT with a resource body creates/updates the resource
    2. Without body: PUT without a body creates the resource with defaults
    
    Expected verb: PUT
    Expected path: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/configurations/default
    Expected query parameter: api-version=2023-12-01-preview
    
    Scenario 1 (with body) - Expected request body:
    ```json
    {
      "location": "eastus",
      "properties": {
        "configValue": "custom-value"
      }
    }
    ```
    Expected response status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/configurations/default",
      "name": "default",
      "type": "Azure.ResourceManager.OperationTemplates/configurations",
      "location": "eastus",
      "properties": {
        "configValue": "custom-value",
        "provisioningState": "Succeeded"
      }
    }
    ```
    
    Scenario 2 (without body) - Expected request body: None (empty)
    Expected response status code: 200
    Expected response body:
    ```json
    {
      "id": "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Azure.ResourceManager.OperationTemplates/configurations/default",
      "name": "default",
      "type": "Azure.ResourceManager.OperationTemplates/configurations",
      "location": "eastus",
      "properties": {
        "configValue": "default-value",
        "provisioningState": "Succeeded"
      }
    }
    ```
    """)
  createOrReplaceOptionalBody is Azure.ResourceManager.Legacy.CreateOrReplaceSync<
    Configuration,
    Request = Configuration,
    Response = ArmResourceUpdatedResponse<Configuration>,
    Error = ErrorResponse,
    OptionalRequestBody = true
  >;
}
