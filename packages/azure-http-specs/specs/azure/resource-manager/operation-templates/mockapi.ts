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
const validLroResource = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/lroResources/lro`,
  name: "top",
  type: "Azure.ResourceManager.Resources/lroResources",
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
let createOrReplacePollCount = 0;
let deletePollCount = 0;

// lro resource
Scenarios.Azure_ResourceManager_OperationTemplates_Lro_createOrReplace = passOnSuccess([
  {
    // LRO PUT initial request
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/lroResources/:lroResourceName",
    method: "put",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        lroResourceName: "lro",
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
      status: 201,
      headers: {
        "azure-asyncoperation": `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/locations/eastus/lro_create/aao`,
      },
      body: json({
        ...validLroResource,
        properties: {
          description: "valid",
          provisioningState: "InProgress",
        },
      }),
    },
    handler: (req: MockRequest) => {
      createOrReplacePollCount = 0;
      return {
        status: 201,
        headers: {
          "azure-asyncoperation": `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/locations/eastus/lro_create/aao`,
        },
        body: json({
          ...validLroResource,
          properties: {
            description: "valid",
            provisioningState: "InProgress",
          },
        }),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO PUT poll intermediate/get final result
    uri: "/subscriptions/:subscriptionId/locations/eastus/lro_create/aao",
    method: "get",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 202,
      body: json({
        id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/locations/eastus/lro_create/aao`,
        name: "aao",
        status: "InProgress",
      }),
    },
    handler: (req: MockRequest) => {
      const aaoResponse = {
        id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/locations/eastus/lro_create/aao`,
        name: "aao",
      };
      const response =
        createOrReplacePollCount > 0
          ? { ...aaoResponse, status: "Succeeded" }
          : { ...aaoResponse, status: "InProgress" };
      const statusCode = createOrReplacePollCount > 0 ? 200 : 202;
      createOrReplacePollCount += 1;
      return {
        status: statusCode,
        body: json(response),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // (Optional) LRO PUT get final result through initial request uri
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/lroResources/:lroResourceName",
    method: "get",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        lroResourceName: "lro",
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validLroResource),
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ResourceManager_OperationTemplates_Lro_delete = passOnSuccess([
  {
    // LRO DELETE initial request
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/lroResources/:lroResourceName",
    method: "delete",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        lroResourceName: "lro",
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
      status: 202,
      headers: {
        location: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/locations/eastus/lro_delete/location`,
        "azure-asyncoperation": `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/locations/eastus/lro_delete/aao`,
      },
    },
    handler: (req: MockRequest) => {
      deletePollCount = 0;
      return {
        status: 202,
        headers: {
          location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/locations/eastus/lro_delete/location`,
          "azure-asyncoperation": `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/locations/eastus/lro_delete/aao`,
        },
        body: json({ id: "delete", status: "InProgress" }),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO DELETE poll intermediate/get final result
    uri: "/subscriptions/:subscriptionId/locations/eastus/lro_delete/:lro_header",
    method: "get",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        "api-version": "2023-12-01-preview",
        lro_header: "aao", // lro_header can be "location" or "aao", depending on the header you choose to poll. "aao" here is just for passing e2e test
      },
    },
    response: {
      status: 200, // This is for passing e2e test. For actual status code, see "handler" definition below
    },
    handler: (req: MockRequest) => {
      let response;
      const lro_header = req.params["lro_header"];
      if (lro_header === "location") {
        response =
          // first status will be 202, second and forward be 204
          deletePollCount > 0
            ? { status: 204 }
            : { status: 202, body: json({ id: "delete", status: "InProgress" }) };
      } else if (lro_header === "aao") {
        const aaoResponse = {
          id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/locations/eastus/lro_delete/aao`,
          name: "aao",
        };
        // first provisioningState will be "InProgress", second and forward be "Succeeded"
        const responseBody =
          deletePollCount > 0
            ? { ...aaoResponse, status: "Succeeded" }
            : { ...aaoResponse, status: "InProgress" };

        response = {
          status: 200, // aao always returns 200 with response body
          body: json(responseBody),
        };
      } else {
        throw new ValidationError(`Unexpected lro header: ${lro_header}`, undefined, undefined);
      }

      deletePollCount += 1;

      return response;
    },
    kind: "MockApiDefinition",
  },
]);
