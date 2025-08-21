import {
  json,
  MockRequest,
  passOnSuccess,
  ScenarioMockApi,
  ValidationError,
} from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const SUBSCRIPTION_ID_EXPECTED = "00000000-0000-0000-0000-000000000000";
const RESOURCE_GROUP_EXPECTED = "test-rg";
const LOCATION_EXPECTED = "eastus";

const validSubscriptionResource1 = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s/sub-resource-1`,
  name: "sub-resource-1",
  type: "_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s",
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
};

const validSubscriptionResource2 = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s/sub-resource-2`,
  name: "sub-resource-2", 
  type: "_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s",
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
};

const validResourceGroupResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/resourceGroupResources/rg-resource`,
  name: "rg-resource",
  type: "_Specs_.Azure.ResourceManager.MethodSubscriptionId/resourceGroupResources",
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
};

// Scenario 1: Two subscription resources with method-level subscriptionId
Scenarios.TwoSubscriptionResourcesMethodLevel_SubscriptionResource1Operations_get = passOnSuccess({
  uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s/sub-resource-1`,
  method: "GET",
  request: {},
  response: {
    status: 200,
    body: json(validSubscriptionResource1),
  },
  handler: (req: MockRequest) => {
    return {
      status: 200,
      body: json(validSubscriptionResource1),
    };
  },
});

Scenarios.TwoSubscriptionResourcesMethodLevel_SubscriptionResource1Operations_put = passOnSuccess({
  uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s/sub-resource-1`,
  method: "PUT",
  request: {
    body: {
      properties: {
        description: "Valid subscription resource 1",
      },
    },
  },
  response: {
    status: 200,
    body: json(validSubscriptionResource1),
  },
  handler: (req: MockRequest) => {
    return {
      status: 200,
      body: json(validSubscriptionResource1),
    };
  },
});

Scenarios.TwoSubscriptionResourcesMethodLevel_SubscriptionResource1Operations_delete = passOnSuccess({
  uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource1s/sub-resource-1`,
  method: "DELETE",
  request: {},
  response: {
    status: 204,
  },
  handler: (req: MockRequest) => {
    return {
      status: 204,
    };
  },
});

Scenarios.TwoSubscriptionResourcesMethodLevel_SubscriptionResource2Operations_get = passOnSuccess({
  uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s/sub-resource-2`,
  method: "GET", 
  request: {},
  response: {
    status: 200,
    body: json(validSubscriptionResource2),
  },
  handler: (req: MockRequest) => {
    return {
      status: 200,
      body: json(validSubscriptionResource2),
    };
  },
});

Scenarios.TwoSubscriptionResourcesMethodLevel_SubscriptionResource2Operations_put = passOnSuccess({
  uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s/sub-resource-2`,
  method: "PUT",
  request: {
    body: {
      properties: {
        configValue: "test-config",
      },
    },
  },
  response: {
    status: 200,
    body: json(validSubscriptionResource2),
  },
  handler: (req: MockRequest) => {
    return {
      status: 200,
      body: json(validSubscriptionResource2),
    };
  },
});

Scenarios.TwoSubscriptionResourcesMethodLevel_SubscriptionResource2Operations_delete = passOnSuccess({
  uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResource2s/sub-resource-2`,
  method: "DELETE",
  request: {},
  response: {
    status: 204,
  },
  handler: (req: MockRequest) => {
    return {
      status: 204,
    };
  },
});

// Scenario 2: Mixed subscription placement
Scenarios.MixedSubscriptionPlacement_SubscriptionResourceOperations_get = passOnSuccess({
  uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResources/sub-resource`,
  method: "GET",
  request: {},
  response: {
    status: 200,
    body: json({
      id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResources/sub-resource`,
      name: "sub-resource",
      type: "_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResources",
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
  handler: (req: MockRequest) => {
    return {
      status: 200,
      body: json({
        id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResources/sub-resource`,
        name: "sub-resource",
        type: "_Specs_.Azure.ResourceManager.MethodSubscriptionId/subscriptionResources",
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
    };
  },
});

Scenarios.MixedSubscriptionPlacement_ResourceGroupResourceOperations_get = passOnSuccess({
  uri: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/_Specs_.Azure.ResourceManager.MethodSubscriptionId/resourceGroupResources/rg-resource`,
  method: "GET",
  request: {},
  response: {
    status: 200,
    body: json(validResourceGroupResource),
  },
  handler: (req: MockRequest) => {
    return {
      status: 200, 
      body: json(validResourceGroupResource),
    };
  },
});