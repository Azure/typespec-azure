import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const SUBSCRIPTION_ID_EXPECTED = "00000000-0000-0000-0000-000000000000";
const PRINCIPAL_ID_EXPECTED = "00000000-0000-0000-0000-000000000000";
const TENANT_ID_EXPECTED = "00000000-0000-0000-0000-000000000000";
const CLIENT_ID_EXPECTED = "00000000-0000-0000-0000-000000000000";
const LOCATION_REGION_EXPECTED = "eastus";
const RESOURCE_GROUP_EXPECTED = "test-rg";
const IDENTITY_TYPE_SYSTEM_ASSIGNED_EXPECTED = "SystemAssigned";
const IDENTITY_TYPE_SYSTEM_USER_ASSIGNED_EXPECTED = "SystemAssigned,UserAssigned";
const validSystemAssignedManagedIdentityResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.Models.CommonTypes.ManagedIdentity/managedIdentityTrackedResources/identity`,
  location: `${LOCATION_REGION_EXPECTED}`,
  tags: {
    tagKey1: "tagValue1",
  },
  identity: {
    type: `${IDENTITY_TYPE_SYSTEM_ASSIGNED_EXPECTED}`,
    principalId: `${PRINCIPAL_ID_EXPECTED}`,
    tenantId: `${TENANT_ID_EXPECTED}`,
  },
  properties: {
    provisioningState: "Succeeded",
  },
};

const validUserAssignedAndSystemAssignedManagedIdentityResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.Models.CommonTypes.ManagedIdentity/managedIdentityTrackedResources/identity`,
  location: `${LOCATION_REGION_EXPECTED}`,
  tags: {
    tagKey1: "tagValue1",
  },
  identity: {
    type: `${IDENTITY_TYPE_SYSTEM_USER_ASSIGNED_EXPECTED}`,
    userAssignedIdentities: {
      "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id1":
        {
          principalId: `${PRINCIPAL_ID_EXPECTED}`,
          clientId: `${CLIENT_ID_EXPECTED}`,
        },
    },
    principalId: `${PRINCIPAL_ID_EXPECTED}`,
    tenantId: `${TENANT_ID_EXPECTED}`,
  },
  properties: {
    provisioningState: "Succeeded",
  },
};

const createExpectedIdentity = {
  type: `${IDENTITY_TYPE_SYSTEM_ASSIGNED_EXPECTED}`,
};

const updateExpectedIdentity = {
  type: `${IDENTITY_TYPE_SYSTEM_USER_ASSIGNED_EXPECTED}`,
  userAssignedIdentities: {
    "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id1":
      {},
  },
};

// managed identity tracked resource
Scenarios.Azure_ResourceManager_Models_CommonTypes_ManagedIdentity_ManagedIdentityTrackedResources_get =
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Models.CommonTypes.ManagedIdentity/managedIdentityTrackedResources/:managedIdentityResourceName",
    method: "get",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        managedIdentityResourceName: "identity",
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validSystemAssignedManagedIdentityResource),
    },
    kind: "MockApiDefinition",
  });

Scenarios.Azure_ResourceManager_Models_CommonTypes_ManagedIdentity_ManagedIdentityTrackedResources_createWithSystemAssigned =
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Models.CommonTypes.ManagedIdentity/managedIdentityTrackedResources/:managedIdentityResourceName",
    method: "put",
    request: {
      body: {
        identity: createExpectedIdentity,
      },
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        managedIdentityResourceName: "identity",
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validSystemAssignedManagedIdentityResource),
    },
    kind: "MockApiDefinition",
  });

Scenarios.Azure_ResourceManager_Models_CommonTypes_ManagedIdentity_ManagedIdentityTrackedResources_updateWithUserAssignedAndSystemAssigned =
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.Models.CommonTypes.ManagedIdentity/managedIdentityTrackedResources/:managedIdentityResourceName",
    method: "patch",
    request: {
      body: {
        identity: updateExpectedIdentity,
      },
      headers: {
        "Content-Type": "application/merge-patch+json",
      },
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        managedIdentityResourceName: "identity",
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validUserAssignedAndSystemAssignedManagedIdentityResource),
    },
    kind: "MockApiDefinition",
  });
