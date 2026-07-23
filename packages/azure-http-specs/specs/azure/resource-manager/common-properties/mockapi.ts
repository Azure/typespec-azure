import { deepEquals } from "@typespec/compiler/utils";
import {
  json,
  passOnCode,
  passOnSuccess,
  ScenarioMockApi,
  ValidationError,
} from "@typespec/spec-api";

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
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/identity`,
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
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/identity`,
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
Scenarios.Azure_ResourceManager_CommonProperties_ManagedIdentity_get = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/:managedIdentityResourceName",
  method: "get",
  request: {
    pathParams: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      managedIdentityResourceName: "identity",
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validSystemAssignedManagedIdentityResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_CommonProperties_ManagedIdentity_createWithSystemAssigned =
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/:managedIdentityResourceName",
    method: "put",
    request: {
      body: json({
        location: "eastus",
        tags: {
          tagKey1: "tagValue1",
        },
        properties: {},
        identity: createExpectedIdentity,
      }),
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        managedIdentityResourceName: "identity",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validSystemAssignedManagedIdentityResource),
    },
    kind: "MockApiDefinition",
    handler: (req) => {
      // .NET SDK would not send "properties" property, if it is empty.
      // Hence here we only verify "identity" property.
      if (!deepEquals(req.body["identity"], createExpectedIdentity)) {
        throw new ValidationError(
          "Body should contain 'identity' property",
          createExpectedIdentity,
          req.body,
        );
      }
      return {
        status: 200,
        body: json(validSystemAssignedManagedIdentityResource),
      };
    },
  });

Scenarios.Azure_ResourceManager_CommonProperties_ManagedIdentity_updateWithUserAssignedAndSystemAssigned =
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.CommonProperties/managedIdentityTrackedResources/:managedIdentityResourceName",
    method: "patch",
    request: {
      body: json({
        identity: updateExpectedIdentity,
      }),
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        managedIdentityResourceName: "identity",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validUserAssignedAndSystemAssignedManagedIdentityResource),
    },
    kind: "MockApiDefinition",
    handler: (req) => {
      if (!deepEquals(req.body["identity"], updateExpectedIdentity)) {
        throw new ValidationError(
          "Body should contain 'identity' property",
          updateExpectedIdentity,
          req.body,
        );
      }
      return {
        status: 200,
        body: json(validUserAssignedAndSystemAssignedManagedIdentityResource),
      };
    },
  });

Scenarios.Azure_ResourceManager_CommonProperties_Error_getForPredefinedError = passOnCode(404, {
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.CommonProperties/confidentialResources/:resourceName",
  method: "get",
  request: {
    pathParams: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      resourceName: "confidential",
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
    status: 404,
  },
  response: {
    status: 404,
    body: json({
      error: {
        code: "ResourceNotFound",
        message:
          "The Resource 'Azure.ResourceManager.CommonProperties/confidentialResources/confidential' under resource group 'test-rg' was not found.",
      },
    }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_CommonProperties_Error_createForUserDefinedError = passOnCode(400, {
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.CommonProperties/confidentialResources/:resourceName",
  method: "put",
  request: {
    body: json({
      location: "eastus",
      properties: {
        username: "00",
      },
    }),
    pathParams: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      resourceName: "confidential",
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
    status: 400,
  },
  response: {
    status: 400,
    body: json({
      error: {
        code: "BadRequest",
        message: "Username should not contain only numbers.",
        innererror: {
          exceptiontype: "general",
        },
      },
    }),
  },
  kind: "MockApiDefinition",
});

// armResourceIdentifier resources
const SIMPLE_ARM_ID = `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Microsoft.Network/virtualNetworks/myVnet`;
const ARM_ID_WITH_TYPE = `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Microsoft.Network/virtualNetworks/myVnet`;
const ARM_ID_WITH_TYPE_AND_SCOPE = `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Microsoft.Network/virtualNetworks/myVnet`;
const ARM_ID_WITH_ALL_SCOPES = `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Microsoft.Compute/virtualMachines/myVm`;
const ARM_ID_WITH_GROUP_SCOPE = `/providers/Microsoft.Management/serviceGroups/test-sg/providers/Microsoft.Authorization/roleDefinitions/${SUBSCRIPTION_ID_EXPECTED}`;

const validArmResourceIdentifierResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.CommonProperties/armResourceIdentifierResources/armId`,
  location: `${LOCATION_REGION_EXPECTED}`,
  name: "armId",
  type: "Azure.ResourceManager.CommonProperties/armResourceIdentifierResources",
  properties: {
    provisioningState: "Succeeded",
    simpleArmId: SIMPLE_ARM_ID,
    armIdWithType: ARM_ID_WITH_TYPE,
    armIdWithTypeAndScope: ARM_ID_WITH_TYPE_AND_SCOPE,
    armIdWithAllScopes: ARM_ID_WITH_ALL_SCOPES,
    armIdWithGroupScope: ARM_ID_WITH_GROUP_SCOPE,
  },
};

Scenarios.Azure_ResourceManager_CommonProperties_ArmResourceIdentifiers_get = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.CommonProperties/armResourceIdentifierResources/:armResourceIdentifierResourceName",
  method: "get",
  request: {
    pathParams: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      armResourceIdentifierResourceName: "armId",
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validArmResourceIdentifierResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_CommonProperties_ArmResourceIdentifiers_createOrReplace =
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.CommonProperties/armResourceIdentifierResources/:armResourceIdentifierResourceName",
    method: "put",
    request: {
      body: json({
        location: "eastus",
        properties: {
          simpleArmId: SIMPLE_ARM_ID,
          armIdWithType: ARM_ID_WITH_TYPE,
          armIdWithTypeAndScope: ARM_ID_WITH_TYPE_AND_SCOPE,
          armIdWithAllScopes: ARM_ID_WITH_ALL_SCOPES,
          armIdWithGroupScope: ARM_ID_WITH_GROUP_SCOPE,
        },
      }),
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        armResourceIdentifierResourceName: "armId",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validArmResourceIdentifierResource),
    },
    kind: "MockApiDefinition",
  });
