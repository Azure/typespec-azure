import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const SERVICE_GROUP_ID = "test-sg";
const RESOURCE_NAME = "resource";
const BASE_URI = `/providers/Microsoft.Management/serviceGroups/${SERVICE_GROUP_ID}/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources`;

const validServiceGroupExtensionResource = {
  id: `${BASE_URI}/${RESOURCE_NAME}`,
  name: RESOURCE_NAME,
  type: "Microsoft.ServiceGroupExtension/serviceGroupExtensionResources",
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

Scenarios.Azure_ResourceManager_ServiceGroupExtension_ServiceGroupExtensionResources_get =
  passOnSuccess({
    uri: `/providers/Microsoft.Management/serviceGroups/:serviceGroupId/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/:serviceGroupExtensionResourceName`,
    method: "get",
    request: {
      pathParams: {
        serviceGroupId: SERVICE_GROUP_ID,
        serviceGroupExtensionResourceName: RESOURCE_NAME,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validServiceGroupExtensionResource),
    },
    kind: "MockApiDefinition",
  });

Scenarios.Azure_ResourceManager_ServiceGroupExtension_ServiceGroupExtensionResources_createOrUpdate =
  passOnSuccess({
    uri: `/providers/Microsoft.Management/serviceGroups/:serviceGroupId/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/:serviceGroupExtensionResourceName`,
    method: "put",
    request: {
      pathParams: {
        serviceGroupId: SERVICE_GROUP_ID,
        serviceGroupExtensionResourceName: RESOURCE_NAME,
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
      body: json(validServiceGroupExtensionResource),
    },
    kind: "MockApiDefinition",
  });

Scenarios.Azure_ResourceManager_ServiceGroupExtension_ServiceGroupExtensionResources_update =
  passOnSuccess({
    uri: `/providers/Microsoft.Management/serviceGroups/:serviceGroupId/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/:serviceGroupExtensionResourceName`,
    method: "patch",
    request: {
      pathParams: {
        serviceGroupId: SERVICE_GROUP_ID,
        serviceGroupExtensionResourceName: RESOURCE_NAME,
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
        ...validServiceGroupExtensionResource,
        properties: {
          provisioningState: "Succeeded",
          description: "valid2",
        },
      }),
    },
    kind: "MockApiDefinition",
  });

Scenarios.Azure_ResourceManager_ServiceGroupExtension_ServiceGroupExtensionResources_delete =
  passOnSuccess({
    uri: `/providers/Microsoft.Management/serviceGroups/:serviceGroupId/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources/:serviceGroupExtensionResourceName`,
    method: "delete",
    request: {
      pathParams: {
        serviceGroupId: SERVICE_GROUP_ID,
        serviceGroupExtensionResourceName: RESOURCE_NAME,
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

Scenarios.Azure_ResourceManager_ServiceGroupExtension_ServiceGroupExtensionResources_listByServiceGroup =
  passOnSuccess({
    uri: `/providers/Microsoft.Management/serviceGroups/:serviceGroupId/providers/Microsoft.ServiceGroupExtension/serviceGroupExtensionResources`,
    method: "get",
    request: {
      pathParams: {
        serviceGroupId: SERVICE_GROUP_ID,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json({
        value: [validServiceGroupExtensionResource],
      }),
    },
    kind: "MockApiDefinition",
  });
