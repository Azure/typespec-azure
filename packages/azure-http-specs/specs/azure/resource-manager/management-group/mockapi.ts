import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const MANAGEMENT_GROUP_ID = "test-mg";
const RESOURCE_NAME = "resource";
const BASE_URI = `/providers/Microsoft.Management/managementGroups/${MANAGEMENT_GROUP_ID}/providers/Microsoft.ManagementGroupChild/managementGroupChildResources`;

const validManagementGroupChildResource = {
  id: `${BASE_URI}/${RESOURCE_NAME}`,
  name: RESOURCE_NAME,
  type: "Microsoft.ManagementGroupChild/managementGroupChildResources",
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

Scenarios.Azure_ResourceManager_ManagementGroup_ManagementGroupChildResources_get = passOnSuccess({
  uri: `/providers/Microsoft.Management/managementGroups/:managementGroupId/providers/Microsoft.ManagementGroupChild/managementGroupChildResources/:managementGroupChildResourceName`,
  method: "get",
  request: {
    pathParams: {
      managementGroupId: MANAGEMENT_GROUP_ID,
      managementGroupChildResourceName: RESOURCE_NAME,
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validManagementGroupChildResource),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_ManagementGroup_ManagementGroupChildResources_createOrUpdate =
  passOnSuccess({
    uri: `/providers/Microsoft.Management/managementGroups/:managementGroupId/providers/Microsoft.ManagementGroupChild/managementGroupChildResources/:managementGroupChildResourceName`,
    method: "put",
    request: {
      pathParams: {
        managementGroupId: MANAGEMENT_GROUP_ID,
        managementGroupChildResourceName: RESOURCE_NAME,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
      body: json({
        properties: {
          description: "valid",
        },
      }),
    },
    response: {
      status: 200,
      body: json(validManagementGroupChildResource),
    },
    kind: "MockApiDefinition",
  });

Scenarios.Azure_ResourceManager_ManagementGroup_ManagementGroupChildResources_update =
  passOnSuccess({
    uri: `/providers/Microsoft.Management/managementGroups/:managementGroupId/providers/Microsoft.ManagementGroupChild/managementGroupChildResources/:managementGroupChildResourceName`,
    method: "patch",
    request: {
      pathParams: {
        managementGroupId: MANAGEMENT_GROUP_ID,
        managementGroupChildResourceName: RESOURCE_NAME,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
      body: json({
        properties: {
          description: "valid2",
        },
      }),
    },
    response: {
      status: 200,
      body: json({
        ...validManagementGroupChildResource,
        properties: {
          provisioningState: "Succeeded",
          description: "valid2",
        },
      }),
    },
    kind: "MockApiDefinition",
  });

Scenarios.Azure_ResourceManager_ManagementGroup_ManagementGroupChildResources_delete =
  passOnSuccess({
    uri: `/providers/Microsoft.Management/managementGroups/:managementGroupId/providers/Microsoft.ManagementGroupChild/managementGroupChildResources/:managementGroupChildResourceName`,
    method: "delete",
    request: {
      pathParams: {
        managementGroupId: MANAGEMENT_GROUP_ID,
        managementGroupChildResourceName: RESOURCE_NAME,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  });

Scenarios.Azure_ResourceManager_ManagementGroup_ManagementGroupChildResources_listByManagementGroup =
  passOnSuccess({
    uri: `/providers/Microsoft.Management/managementGroups/:managementGroupId/providers/Microsoft.ManagementGroupChild/managementGroupChildResources`,
    method: "get",
    request: {
      pathParams: {
        managementGroupId: MANAGEMENT_GROUP_ID,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        value: [validManagementGroupChildResource],
      }),
    },
    kind: "MockApiDefinition",
  });
