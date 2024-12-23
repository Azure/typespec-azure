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
const validOrder = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/orders/order1`,
  name: "order1",
  type: "Azure.ResourceManager.Resources/orders",
  location: "eastus",
  properties: {
    provisioningState: "Succeeded",
    productId: "product1",
    amount: 1,
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
const validCheckNameAvailability = {
  nameAvailable: false,
  reason: "AlreadyExists",
  message: "Hostname 'checkName' already exists. Please select a different name.",
};
let createOrReplacePollCount = 0;
let postPollCount = 0;
let deletePollCount = 0;

// Check Global Name Availability
Scenarios.Azure_ResourceManager_OperationTemplates_CheckNameAvailability_checkGlobal =
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/checkNameAvailability",
    method: "post",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        "api-version": "2023-12-01-preview",
      },
      body: {
        name: "checkName",
        type: "Microsoft.Web/site",
      },
    },
    response: {
      status: 200,
      body: json(validCheckNameAvailability),
    },
    kind: "MockApiDefinition",
  });

// Check Local Name Availability
Scenarios.Azure_ResourceManager_OperationTemplates_CheckNameAvailability_checkLocal = 
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/:location/checkNameAvailability",
    method: "post",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        location: "westus",
        "api-version": "2023-12-01-preview",
      },
      body: {
        name: "checkName",
        type: "Microsoft.Web/site",
      },
    },
    response: {
      status: 200,
      body: json(validCheckNameAvailability),
    },
    kind: "MockApiDefinition",
  });

// lro resource
Scenarios.Azure_ResourceManager_OperationTemplates_Lro_createOrReplace = passOnSuccess([
  {
    // LRO PUT initial request
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/orders/:orderName",
    method: "put",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        orderName: "order1",
        "api-version": "2023-12-01-preview",
      },
      body: {
        location: "eastus",
        properties: {
          productId: "product1",
          amount: 1,
        },
      },
    },
    response: {
      status: 201,
      headers: {
        "azure-asyncoperation": `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao`,
      },
      body: json({
        ...validOrder,
        properties: {
          provisioningState: "InProgress",
        },
      }),
    },
    handler: (req: MockRequest) => {
      createOrReplacePollCount = 0;
      return {
        status: 201,
        headers: {
          "azure-asyncoperation": `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao`,
        },
        body: json({
          ...validOrder,
          properties: {
            provisioningState: "InProgress",
          },
        }),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO PUT poll intermediate/get final result
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao",
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
        id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao`,
        name: "lro_create_aao",
        startTime: "2024-11-08T01:41:53.5508583+00:00",
        status: "InProgress",
      }),
    },
    handler: (req: MockRequest) => {
      const aaoResponse = {
        id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao`,
        name: "lro_create_aao",
        startTime: "2024-11-08T01:41:53.5508583+00:00",
      };
      const response =
        createOrReplacePollCount > 0
          ? {
              ...aaoResponse,
              status: "Succeeded",
              endTime: "2024-11-08T01:42:41.5354192+00:00",
              properties: validOrder,
            }
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
    // LRO PUT get final result through initial request uri
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/orders/:orderName",
    method: "get",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        orderName: "order1",
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validOrder),
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ResourceManager_OperationTemplates_Lro_export = passOnSuccess([
  {
    // LRO POST initial request
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/orders/:orderName/export",
    method: "post",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        orderName: "order1",
        "api-version": "2023-12-01-preview",
      },
      body: {
        format: "csv",
      },
    },
    response: {
      status: 202,
      headers: {
        location: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_location`,
        "azure-asyncoperation": `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao`,
      },
    },
    handler: (req: MockRequest) => {
      postPollCount = 0;
      return {
        status: 202,
        headers: {
          location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_location`,
          "azure-asyncoperation": `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO POST poll intermediate/get final result
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/:operation_name",
    method: "get",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        "api-version": "2023-12-01-preview",
        operation_name: "lro_post_aao", // operation_name can be "lro_post_location" or "lro_post_aao", depending on the header you choose to poll. "lro_post_aao" here is just for passing e2e test
      },
    },
    response: {
      status: 200, // This is for passing e2e test. For actual status code, see "handler" definition below
    },
    handler: (req: MockRequest) => {
      let response;
      const operation_name = req.params["operation_name"];
      if (operation_name === "lro_post_location") {
        response =
          // first status will be 200, second and forward be 204
          postPollCount > 0
            ? {
                status: 200,
                body: json({
                  content: "order1,product1,1",
                }),
              }
            : { status: 202 };
      } else if (operation_name === "lro_post_aao") {
        const aaoResponse = {
          id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao`,
          name: "lro_post_aao",
          startTime: "2024-11-08T01:41:53.5508583+00:00",
        };
        // first provisioningState will be "InProgress", second and forward be "Succeeded"
        const responseBody =
          postPollCount > 0
            ? {
                ...aaoResponse,
                status: "Succeeded",
                endTime: "2024-11-08T01:42:41.5354192+00:00",
              }
            : { ...aaoResponse, status: "InProgress" };

        response = {
          status: 200, // aao always returns 200 with response body
          body: json(responseBody),
        };
      } else {
        throw new ValidationError(
          `Unexpected lro poll operation: ${operation_name}`,
          undefined,
          undefined,
        );
      }

      postPollCount += 1;

      return response;
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ResourceManager_OperationTemplates_Lro_delete = passOnSuccess([
  {
    // LRO DELETE initial request
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/orders/:orderName",
    method: "delete",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        orderName: "order1",
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 202,
      headers: {
        location: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/lro_delete_location`,
      },
    },
    handler: (req: MockRequest) => {
      deletePollCount = 0;
      return {
        status: 202,
        headers: {
          location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/lro_delete_location`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO DELETE poll intermediate/get final result
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/lro_delete_location",
    method: "get",
    request: {
      params: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 202, // This is for passing e2e test. For actual status code, see "handler" definition below
    },
    handler: (req: MockRequest) => {
      const response =
        // first status will be 202, second and forward be 204
        deletePollCount > 0 ? { status: 204 } : { status: 202 };

      deletePollCount += 1;

      return response;
    },
    kind: "MockApiDefinition",
  },
]);