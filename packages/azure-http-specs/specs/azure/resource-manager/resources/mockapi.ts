import { json, MockApiDefinition, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const SUBSCRIPTION_ID_EXPECTED = "00000000-0000-0000-0000-000000000000";
const RESOURCE_GROUP_EXPECTED = "test-rg";
const LOCATION_EXPECTED = "eastus";
const SUBSCRIPTION_SCOPE_URI = `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}`;
const RESOURCE_GROUP_SCOPE_URI = `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}`;
const RESOURCE_SCOPE_URI = `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top`;
const SPLIT_SUBSCRIPTION_SCOPE_URI = `subscriptions/${SUBSCRIPTION_ID_EXPECTED}`;
const SPLIT_RESOURCE_GROUP_SCOPE_URI = `subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}`;
const SPLIT_RESOURCE_SCOPE_URI = `subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top`;
const TENANT_SCOPE_URI = "";
const EXTENSION_RESOURCE_NAME = "extension";
const validTopLevelResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top`,
  name: "top",
  type: "Azure.ResourceManager.Resources/topLevelTrackedResources",
  location: "eastus",
  properties: {
    provisioningState: "Succeeded",
    description: "valid",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: "2024-10-04T00:56:07.442Z",
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: "2024-10-04T00:56:07.442Z",
    lastModifiedByType: "User",
  },
};

const validNestedResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources/nested`,
  name: "nested",
  type: "Azure.ResourceManager.Resources/topLevelTrackedResources/top/nestedProxyResources",
  properties: {
    provisioningState: "Succeeded",
    description: "valid",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: "2024-10-04T00:56:07.442Z",
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: "2024-10-04T00:56:07.442Z",
    lastModifiedByType: "User",
  },
};

const validSingletonResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default`,
  name: "default",
  type: "Azure.ResourceManager.Resources/singletonTrackedResources",
  location: "eastus",
  properties: {
    provisioningState: "Succeeded",
    description: "valid",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: "2024-10-04T00:56:07.442Z",
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: "2024-10-04T00:56:07.442Z",
    lastModifiedByType: "User",
  },
};

const validLocationResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.Resources/locations/${LOCATION_EXPECTED}/locationResources/resource`,
  name: "resource",
  type: "Azure.ResourceManager.Resources/locationResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: "2024-10-04T00:56:07.442Z",
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: "2024-10-04T00:56:07.442Z",
    lastModifiedByType: "User",
  },
};

const validResourceGroupExtensionsResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.Resources/extensionsResources/extension`,
  name: "extension",
  type: "Azure.ResourceManager.Resources/extensionsResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: "2024-10-04T00:56:07.442Z",
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: "2024-10-04T00:56:07.442Z",
    lastModifiedByType: "User",
  },
};

const validSubscriptionExtensionsResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.Resources/extensionsResources/extension`,
  name: "extension",
  type: "Azure.ResourceManager.Resources/extensionsResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: "2024-10-04T00:56:07.442Z",
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: "2024-10-04T00:56:07.442Z",
    lastModifiedByType: "User",
  },
};

const validTenantExtensionsResource = {
  id: `/providers/Azure.ResourceManager.Resources/extensionsResources/extension`,
  name: "extension",
  type: "Azure.ResourceManager.Resources/extensionsResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: "2024-10-04T00:56:07.442Z",
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: "2024-10-04T00:56:07.442Z",
    lastModifiedByType: "User",
  },
};

const validResourceExtensionsResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/top/providers/Azure.ResourceManager.Resources/extensionsResources/extension`,
  name: "extension",
  type: "Azure.ResourceManager.Resources/extensionsResources",
  properties: {
    description: "valid",
    provisioningState: "Succeeded",
  },
  systemData: {
    createdBy: "AzureSDK",
    createdByType: "User",
    createdAt: "2024-10-04T00:56:07.442Z",
    lastModifiedBy: "AzureSDK",
    lastModifiedAt: "2024-10-04T00:56:07.442Z",
    lastModifiedByType: "User",
  },
};

function createExtensionGetMockApiDefinition(
  resourceUri: string,
  extensionName: string,
  validResource: any,
): MockApiDefinition {
  return {
    uri: `/${resourceUri}/providers/Azure.ResourceManager.Resources/extensionsResources/${extensionName}`,
    method: "get",
    request: {
      params: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validResource),
    },
    kind: "MockApiDefinition",
  };
}

// extension tracked resource
Scenarios.Azure_ResourceManager_Resources_ExtensionsResources_get = passOnSuccess([
  createExtensionGetMockApiDefinition(
    RESOURCE_GROUP_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceGroupExtensionsResource,
  ),
  createExtensionGetMockApiDefinition(
    SPLIT_RESOURCE_GROUP_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceGroupExtensionsResource,
  ),
  createExtensionGetMockApiDefinition(
    SUBSCRIPTION_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validSubscriptionExtensionsResource,
  ),
  createExtensionGetMockApiDefinition(
    SPLIT_SUBSCRIPTION_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validSubscriptionExtensionsResource,
  ),
  createExtensionGetMockApiDefinition(
    TENANT_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validTenantExtensionsResource,
  ),
  createExtensionGetMockApiDefinition(
    RESOURCE_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceExtensionsResource,
  ),
  createExtensionGetMockApiDefinition(
    SPLIT_RESOURCE_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceExtensionsResource,
  ),
]);

function createExtensionCreateMockApiDefinition(
  resourceUri: string,
  extensionName: string,
  validResource: any,
): MockApiDefinition {
  return {
    uri: `/${resourceUri}/providers/Azure.ResourceManager.Resources/extensionsResources/${extensionName}`,
    method: "put",
    request: {
      params: {
        "api-version": "2023-12-01-preview",
      },
      body: {
        properties: {
          description: "valid",
        },
      },
    },
    response: {
      status: 200,
      body: json(validResource),
    },
    kind: "MockApiDefinition",
  };
}
Scenarios.Azure_ResourceManager_Resources_ExtensionsResources_createOrUpdate = passOnSuccess([
  createExtensionCreateMockApiDefinition(
    RESOURCE_GROUP_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceGroupExtensionsResource,
  ),
  createExtensionCreateMockApiDefinition(
    SPLIT_RESOURCE_GROUP_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceGroupExtensionsResource,
  ),
  createExtensionCreateMockApiDefinition(
    SUBSCRIPTION_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validSubscriptionExtensionsResource,
  ),
  createExtensionCreateMockApiDefinition(
    SPLIT_SUBSCRIPTION_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validSubscriptionExtensionsResource,
  ),
  createExtensionCreateMockApiDefinition(
    TENANT_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validTenantExtensionsResource,
  ),
  createExtensionCreateMockApiDefinition(
    RESOURCE_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceExtensionsResource,
  ),
  createExtensionCreateMockApiDefinition(
    SPLIT_RESOURCE_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceExtensionsResource,
  ),
]);

function createExtensionUpdateMockApiDefinition(
  resourceUri: string,
  extensionName: string,
  validResource: any,
): MockApiDefinition {
  return {
    uri: `${resourceUri}/providers/Azure.ResourceManager.Resources/extensionsResources/${extensionName}`,
    method: "patch",
    request: {
      params: {
        "api-version": "2023-12-01-preview",
      },
      body: {
        properties: {
          description: "valid2",
        },
      },
      headers: {
        "Content-Type": "application/json",
      },
    },
    response: {
      status: 200,
      body: json({
        ...validResource,
        properties: {
          provisioningState: "Succeeded",
          description: "valid2",
        },
      }),
    },
    kind: "MockApiDefinition",
  };
}

Scenarios.Azure_ResourceManager_Resources_ExtensionsResources_update = passOnSuccess([
  createExtensionUpdateMockApiDefinition(
    RESOURCE_GROUP_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceGroupExtensionsResource,
  ),
  createExtensionUpdateMockApiDefinition(
    SUBSCRIPTION_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validSubscriptionExtensionsResource,
  ),
  createExtensionUpdateMockApiDefinition(
    TENANT_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validTenantExtensionsResource,
  ),
  createExtensionUpdateMockApiDefinition(
    RESOURCE_SCOPE_URI,
    EXTENSION_RESOURCE_NAME,
    validResourceExtensionsResource,
  ),
]);

function createExtensionDeleteMockApiDefinition(
  resourceUri: string,
  extensionName: string,
): MockApiDefinition {
  return {
    uri: `/${resourceUri}/providers/Azure.ResourceManager.Resources/extensionsResources/${extensionName}`,
    method: "delete",
    request: {
      params: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  };
}

Scenarios.Azure_ResourceManager_Resources_ExtensionsResources_delete = passOnSuccess([
  createExtensionDeleteMockApiDefinition(RESOURCE_GROUP_SCOPE_URI, EXTENSION_RESOURCE_NAME),
  createExtensionDeleteMockApiDefinition(SPLIT_RESOURCE_GROUP_SCOPE_URI, EXTENSION_RESOURCE_NAME),
  createExtensionDeleteMockApiDefinition(SUBSCRIPTION_SCOPE_URI, EXTENSION_RESOURCE_NAME),
  createExtensionDeleteMockApiDefinition(SPLIT_SUBSCRIPTION_SCOPE_URI, EXTENSION_RESOURCE_NAME),
  createExtensionDeleteMockApiDefinition(TENANT_SCOPE_URI, EXTENSION_RESOURCE_NAME),
  createExtensionDeleteMockApiDefinition(RESOURCE_SCOPE_URI, EXTENSION_RESOURCE_NAME),
  createExtensionDeleteMockApiDefinition(SPLIT_RESOURCE_SCOPE_URI, EXTENSION_RESOURCE_NAME),
]);

function createExtensionListByScopeMockApiDefinition(
  resourceUri: string,
  validResource: any,
): MockApiDefinition {
  return {
    uri: `/${resourceUri}/providers/Azure.ResourceManager.Resources/extensionsResources`,
    method: "get",
    request: {
      params: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        value: [validResource],
      }),
    },
    kind: "MockApiDefinition",
  };
}

Scenarios.Azure_ResourceManager_Resources_ExtensionsResources_listByScope = passOnSuccess([
  createExtensionListByScopeMockApiDefinition(
    RESOURCE_GROUP_SCOPE_URI,
    validResourceGroupExtensionsResource,
  ),
  createExtensionListByScopeMockApiDefinition(
    SPLIT_RESOURCE_GROUP_SCOPE_URI,
    validResourceGroupExtensionsResource,
  ),
  createExtensionListByScopeMockApiDefinition(
    SUBSCRIPTION_SCOPE_URI,
    validSubscriptionExtensionsResource,
  ),
  createExtensionListByScopeMockApiDefinition(
    SPLIT_SUBSCRIPTION_SCOPE_URI,
    validSubscriptionExtensionsResource,
  ),
  createExtensionListByScopeMockApiDefinition(TENANT_SCOPE_URI, validTenantExtensionsResource),
  createExtensionListByScopeMockApiDefinition(RESOURCE_SCOPE_URI, validResourceExtensionsResource),
  createExtensionListByScopeMockApiDefinition(
    SPLIT_RESOURCE_SCOPE_URI,
    validResourceExtensionsResource,
  ),
]);

// location resource
Scenarios.Azure_ResourceManager_Resources_LocationResources_get = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.Resources/locations/:location/locationResources/:locationResourceName",
  method: "get",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      location: LOCATION_EXPECTED,
      locationResourceName: "resource",
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validLocationResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_LocationResources_createOrUpdate = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.Resources/locations/:location/locationResources/:locationResourceName",
  method: "put",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      location: LOCATION_EXPECTED,
      locationResourceName: "resource",
      "api-version": "2023-12-01-preview",
    },
    body: {
      properties: {
        description: "valid",
      },
    },
  },
  response: {
    status: 200,
    body: json(validLocationResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_LocationResources_update = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.Resources/locations/:location/locationResources/:locationResourceName",
  method: "patch",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      location: LOCATION_EXPECTED,
      locationResourceName: "resource",
      "api-version": "2023-12-01-preview",
    },
    body: {
      properties: {
        description: "valid2",
      },
    },
    headers: {
      "Content-Type": "application/json",
    },
  },
  response: {
    status: 200,
    body: json({
      ...validLocationResource,
      properties: {
        provisioningState: "Succeeded",
        description: "valid2",
      },
    }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_LocationResources_delete = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.Resources/locations/:location/locationResources/:locationResourceName",
  method: "delete",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      location: LOCATION_EXPECTED,
      locationResourceName: "resource",
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 204,
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_LocationResources_listByLocation = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.Resources/locations/:location/locationResources",
  method: "get",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      location: LOCATION_EXPECTED,
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json({
      value: [validLocationResource],
    }),
  },
  kind: "MockApiDefinition",
});

// singleton tracked resource
Scenarios.Azure_ResourceManager_Resources_Singleton_getByResourceGroup = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default",
  method: "get",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validSingletonResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_Singleton_createOrUpdate = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default",
  method: "put",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      "api-version": "2023-12-01-preview",
    },
    body: {
      location: "eastus",
      properties: {
        description: "valid",
      },
    },
  },
  response: {
    status: 200,
    body: json(validSingletonResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_Singleton_update = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/singletonTrackedResources/default",
  method: "patch",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      "api-version": "2023-12-01-preview",
    },
    body: {
      properties: {
        description: "valid2",
      },
    },
    headers: {
      "Content-Type": "application/merge-patch+json",
    },
  },
  response: {
    status: 200,
    body: json({
      ...validSingletonResource,
      properties: {
        provisioningState: "Succeeded",
        description: "valid2",
      },
    }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_Singleton_listByResourceGroup = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/singletonTrackedResources",
  method: "get",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json({
      value: [validSingletonResource],
    }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_TopLevel_actionSync = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName/actionSync",
  method: "post",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      "api-version": "2023-12-01-preview",
    },
    body: {
      message: "Resource action at top level.",
      urgent: true,
    },
  },
  response: {
    status: 204,
  },
  kind: "MockApiDefinition",
});

// top level tracked resource
Scenarios.Azure_ResourceManager_Resources_TopLevel_get = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName",
  method: "get",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validTopLevelResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_TopLevel_createOrReplace = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName",
  method: "put",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      "api-version": "2023-12-01-preview",
    },
    body: {
      location: "eastus",
      properties: {
        description: "valid",
      },
    },
  },
  response: {
    status: 200,
    body: json(validTopLevelResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_TopLevel_update = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName",
  method: "patch",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      "api-version": "2023-12-01-preview",
    },
    body: {
      properties: {
        description: "valid2",
      },
    },
    headers: {
      "Content-Type": "application/merge-patch+json",
    },
  },
  response: {
    status: 200,
    body: json({
      ...validTopLevelResource,
      properties: {
        provisioningState: "Succeeded",
        description: "valid2",
      },
    }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_TopLevel_delete = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName",
  method: "delete",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 204,
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_TopLevel_listByResourceGroup = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources",
  method: "get",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json({
      value: [validTopLevelResource],
    }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_TopLevel_listBySubscription = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.Resources/topLevelTrackedResources",
  method: "get",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json({
      value: [validTopLevelResource],
    }),
  },
  kind: "MockApiDefinition",
});

// nested proxy resource
Scenarios.Azure_ResourceManager_Resources_Nested_get = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName/nestedProxyResources/:nestedResourceName",
  method: "get",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      nestedResourceName: "nested",
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validNestedResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_Nested_createOrReplace = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName/nestedProxyResources/:nestedResourceName",
  method: "put",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      nestedResourceName: "nested",
      "api-version": "2023-12-01-preview",
    },
    body: {
      properties: {
        description: "valid",
      },
    },
  },
  response: {
    status: 200,
    body: json(validNestedResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_Nested_update = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName/nestedProxyResources/:nestedResourceName",
  method: "patch",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      nestedResourceName: "nested",
      "api-version": "2023-12-01-preview",
    },
    body: {
      properties: {
        description: "valid2",
      },
    },
    headers: {
      "Content-Type": "application/merge-patch+json",
    },
  },
  response: {
    status: 200,
    body: json({
      ...validNestedResource,
      properties: {
        provisioningState: "Succeeded",
        description: "valid2",
      },
    }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_Nested_delete = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName/nestedProxyResources/:nestedResourceName",
  method: "delete",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      nestedResourceName: "nested",
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 204,
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_Resources_Nested_listByTopLevelTrackedResource = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Resources/topLevelTrackedResources/:topLevelResourceName/nestedProxyResources",
  method: "get",
  request: {
    params: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      topLevelResourceName: "top",
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json({
      value: [validNestedResource],
    }),
  },
  kind: "MockApiDefinition",
});
