import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const SUBSCRIPTION_ID_EXPECTED = "00000000-0000-0000-0000-000000000000";
const RESOURCE_GROUP_EXPECTED = "test-rg";
const LOCATION_EXPECTED = "eastus";

// Scenario 1: Two subscription resources with method-level subscriptionId
Scenarios.Azure_ResourceManager_MethodSubscriptionId_TwoSubscriptionResourcesMethodLevel =
  passOnSuccess([
    {
      uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s/sub-resource-1`,
      method: "get",
      request: {
        query: {
          "api-version": "2023-12-01-preview",
        },
      },
      response: {
        status: 200,
        body: json({
          id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s/sub-resource-1`,
          name: "sub-resource-1",
          type: "Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s",
          properties: {
            provisioningState: "Succeeded",
            description: "Valid subscription resource 1",
          },
          systemData: {
            createdBy: "AzureSDK",
            createdByType: "User",
            createdAt: "2023-01-01T00:00:00.000Z",
            lastModifiedBy: "AzureSDK",
            lastModifiedAt: "2023-01-01T00:00:00.000Z",
            lastModifiedByType: "User",
          },
        }),
      },
      kind: "MockApiDefinition",
    },
    {
      uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s/sub-resource-2`,
      method: "get",
      request: {
        query: {
          "api-version": "2023-12-01-preview",
        },
      },
      response: {
        status: 200,
        body: json({
          id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s/sub-resource-2`,
          name: "sub-resource-2",
          type: "Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s",
          properties: {
            provisioningState: "Succeeded",
            configValue: "test-config",
          },
          systemData: {
            createdBy: "AzureSDK",
            createdByType: "User",
            createdAt: "2023-01-01T00:00:00.000Z",
            lastModifiedBy: "AzureSDK",
            lastModifiedAt: "2023-01-01T00:00:00.000Z",
            lastModifiedByType: "User",
          },
        }),
      },
      kind: "MockApiDefinition",
    },
  ]);

// Scenario 2: Mixed subscription placement
Scenarios.Azure_ResourceManager_MethodSubscriptionId_MixedSubscriptionPlacement = passOnSuccess([
  {
    uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.MethodSubscriptionId/subscriptionResources/sub-resource`,
    method: "get",
    request: {
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.MethodSubscriptionId/subscriptionResources/sub-resource`,
        name: "sub-resource",
        type: "Azure.ResourceManager.MethodSubscriptionId/subscriptionResources",
        properties: {
          provisioningState: "Succeeded",
          subscriptionSetting: "test-sub-setting",
        },
        systemData: {
          createdBy: "AzureSDK",
          createdByType: "User",
          createdAt: "2023-01-01T00:00:00.000Z",
          lastModifiedBy: "AzureSDK",
          lastModifiedAt: "2023-01-01T00:00:00.000Z",
          lastModifiedByType: "User",
        },
      }),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.MethodSubscriptionId/resourceGroupResources/rg-resource`,
    method: "get",
    request: {
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.MethodSubscriptionId/resourceGroupResources/rg-resource`,
        name: "rg-resource",
        type: "Azure.ResourceManager.MethodSubscriptionId/resourceGroupResources",
        location: LOCATION_EXPECTED,
        properties: {
          provisioningState: "Succeeded",
          resourceGroupSetting: "test-setting",
        },
        systemData: {
          createdBy: "AzureSDK",
          createdByType: "User",
          createdAt: "2023-01-01T00:00:00.000Z",
          lastModifiedBy: "AzureSDK",
          lastModifiedAt: "2023-01-01T00:00:00.000Z",
          lastModifiedByType: "User",
        },
      }),
    },
    kind: "MockApiDefinition",
  },
]);
