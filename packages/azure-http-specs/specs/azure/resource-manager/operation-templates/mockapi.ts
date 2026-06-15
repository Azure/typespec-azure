import {
  dyn,
  dynItem,
  json,
  MockRequest,
  passOnSuccess,
  ScenarioMockApi,
  withServiceKeys,
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
const validOperation = {
  name: "Microsoft.Compute/virtualMachines/write",
  isDataAction: false,
  display: {
    provider: "Microsoft Compute",
    resource: "Virtual Machines",
    operation: "Create or Update Virtual Machine.",
    description: "Add or modify virtual machines.",
  },
  origin: "user,system",
  actionType: "Internal",
};
const checkNameAvailabilityResponse = {
  nameAvailable: false,
  reason: "AlreadyExists",
  message: "Hostname 'checkName' already exists. Please select a different name.",
};

let postPagingLroPollCount = 0;
const validProductListResult = {
  value: [
    {
      id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/products/product1`,
      name: "product1",
      type: "Azure.ResourceManager.OperationTemplates/products",
      location: "eastus",
      properties: {
        provisioningState: "Succeeded",
        productId: "product1",
      },
    },
  ],
};
const validProductListResultPage2 = {
  value: [
    {
      id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/products/product2`,
      name: "product2",
      type: "Azure.ResourceManager.OperationTemplates/products",
      location: "eastus",
      properties: {
        provisioningState: "Succeeded",
        productId: "product2",
      },
    },
  ],
};
let createOrReplacePollCount = 0;
let postPollCount = 0;
let deletePollCount = 0;

// operation list
Scenarios.Azure_ResourceManager_OperationTemplates_ListAvailableOperations = passOnSuccess({
  uri: "/providers/Azure.ResourceManager.OperationTemplates/operations",
  method: "get",
  request: {
    query: {
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json({
      value: [validOperation],
    }),
  },
  kind: "MockApiDefinition",
});

// Check Global Name Availability
Scenarios.Azure_ResourceManager_OperationTemplates_CheckNameAvailability_checkGlobal =
  passOnSuccess({
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/checkNameAvailability",
    method: "post",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
      body: json({
        name: "checkName",
        type: "Microsoft.Web/site",
      }),
    },
    response: {
      status: 200,
      body: json(checkNameAvailabilityResponse),
    },
    kind: "MockApiDefinition",
  });

// Check Local Name Availability
Scenarios.Azure_ResourceManager_OperationTemplates_CheckNameAvailability_checkLocal = passOnSuccess(
  {
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/:location/checkNameAvailability",
    method: "post",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        location: "westus",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
      body: json({
        name: "checkName",
        type: "Microsoft.Web/site",
      }),
    },
    response: {
      status: 200,
      body: json(checkNameAvailabilityResponse),
    },
    kind: "MockApiDefinition",
  },
);

// lro resource
Scenarios.Azure_ResourceManager_OperationTemplates_Lro_createOrReplace = passOnSuccess([
  {
    // LRO PUT initial request
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/orders/:orderName",
    method: "put",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        orderName: "order1",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
      body: json({
        location: "eastus",
        properties: {
          productId: "product1",
          amount: 1,
        },
      }),
    },
    response: {
      status: 201,
      headers: {
        "azure-asyncoperation": dyn`${dynItem("baseUrl")}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_create_aao`,
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
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
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
              ...validOrder,
            }
          : { ...aaoResponse, status: "InProgress" };
      const statusCode = 200;
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
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        orderName: "order1",
      },
      query: {
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
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        orderName: "order1",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
      body: json({
        format: "csv",
      }),
    },
    response: {
      status: 202,
      headers: {
        location: dyn`${dynItem("baseUrl")}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_location`,
        "azure-asyncoperation": dyn`${dynItem("baseUrl")}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao`,
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
    // LRO POST poll intermediate/get final result - Location Header
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_location",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
    },
    handler: (req: MockRequest) => {
      const response =
        // first status will be 200, second and forward be 204
        postPollCount > 0
          ? {
              status: 200,
              body: json({
                content: "order1,product1,1",
              }),
            }
          : { status: 202 };

      postPollCount += 1;
      return response;
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO POST poll intermediate/get final result - Azure-AsyncOperation Header
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_post_aao",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
    },
    handler: (req: MockRequest) => {
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

      const response = {
        status: 200, // aao always returns 200 with response body
        body: json(responseBody),
      };

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
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        orderName: "order1",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 202,
      headers: {
        location: dyn`${dynItem("baseUrl")}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/lro_delete_location`,
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
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
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

let exportArrayPollCount = 0;

Scenarios.Azure_ResourceManager_OperationTemplates_Lro_exportArray = passOnSuccess([
  {
    // LRO POST initial request
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/exportArray",
    method: "post",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
      body: json({
        format: "csv",
      }),
    },
    response: {
      status: 202,
      headers: {
        "retry-after": 1,
        location: dyn`${dynItem("baseUrl")}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_location`,
        "azure-asyncoperation": dyn`${dynItem("baseUrl")}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao`,
      },
    },
    handler: (req: MockRequest) => {
      exportArrayPollCount = 0;
      return {
        status: 202,
        headers: {
          "retry-after": 1,
          location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_location`,
          "azure-asyncoperation": `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO POST poll intermediate/get final result - Location Header
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_location",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
    },
    handler: (req: MockRequest) => {
      const response =
        // first status will be 202, second and forward be 200 with array
        exportArrayPollCount > 0
          ? {
              status: 200,
              headers: {
                location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_location`,
              },
              body: json([{ content: "order1,product1,1" }, { content: "order2,product2,2" }]),
            }
          : {
              status: 202,
              headers: {
                "retry-after": 1,
                location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_location`,
              },
            };

      exportArrayPollCount += 1;
      return response;
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO POST poll intermediate/get final result - Azure-AsyncOperation Header
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
    },
    handler: (req: MockRequest) => {
      const aaoResponse = {
        id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao`,
        name: "lro_exportarray_aao",
        startTime: "2024-11-08T01:41:53.5508583+00:00",
      };
      // first provisioningState will be "InProgress", second and forward be "Succeeded"
      const responseBody =
        exportArrayPollCount > 0
          ? {
              ...aaoResponse,
              status: "Succeeded",
              endTime: "2024-11-08T01:42:41.5354192+00:00",
            }
          : { ...aaoResponse, status: "InProgress" };

      const response =
        exportArrayPollCount > 0
          ? {
              status: 200,
              headers: {
                location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_location`,
              },
              body: json(responseBody),
            }
          : {
              status: 200,
              headers: {
                "retry-after": 1,
                "azure-asyncoperation": `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_exportarray_aao`,
              },
              body: json(responseBody),
            };

      exportArrayPollCount += 1;
      return response;
    },
    kind: "MockApiDefinition",
  },
]);

// Optional Body scenarios
const validWidget = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/widgets/widget1`,
  name: "widget1",
  type: "Azure.ResourceManager.OperationTemplates/widgets",
  location: "eastus",
  properties: {
    name: "widget1",
    description: "A test widget",
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

// GET operation
Scenarios.Azure_ResourceManager_OperationTemplates_OptionalBody_get = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/widgets/:widgetName",
  method: "get",
  request: {
    pathParams: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      widgetName: "widget1",
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validWidget),
  },
  kind: "MockApiDefinition",
});

// PATCH operation with optional body - test both with and without body
Scenarios.Azure_ResourceManager_OperationTemplates_OptionalBody_patch = withServiceKeys([
  "EmptyBody",
  "WithBody",
]).pass({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/widgets/:widgetName",
  method: "patch",
  request: {
    pathParams: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      widgetName: "widget1",
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
  },
  handler: (req: MockRequest) => {
    // Check if request has a body with content
    if (req.body && Object.keys(req.body).length > 0) {
      // WithBody scenario - validate and merge request body with existing widget
      const requestBody = req.body as { properties?: { name?: string; description?: string } };

      // Validate expected values
      if (
        requestBody.properties?.name === "updated-widget" &&
        requestBody.properties?.description === "Updated description"
      ) {
        const updatedWidget = {
          ...validWidget,
          properties: {
            ...validWidget.properties,
            name: requestBody.properties.name,
            description: requestBody.properties.description,
          },
        };
        return {
          pass: "WithBody",
          status: 200,
          body: json(updatedWidget),
        };
      } else {
        // Invalid request body values
        return {
          pass: "WithBody",
          status: 400,
          body: json({
            error:
              "Invalid request body values. Expected properties: {name: 'updated-widget', description: 'Updated description'}",
          }),
        };
      }
    } else {
      // EmptyBody scenario - return original widget
      return {
        pass: "EmptyBody",
        status: 200,
        body: json(validWidget),
      };
    }
  },
  kind: "MockApiDefinition",
});

// POST action operation with optional body - test both with and without body
Scenarios.Azure_ResourceManager_OperationTemplates_OptionalBody_post = withServiceKeys([
  "EmptyBody",
  "WithBody",
]).pass({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/widgets/:widgetName/post",
  method: "post",
  request: {
    pathParams: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      widgetName: "widget1",
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
  },
  handler: (req: MockRequest) => {
    // Check if request has a body with content
    if (req.body && Object.keys(req.body).length > 0) {
      // WithBody scenario - validate request body values
      const requestBody = req.body as { actionType?: string; parameters?: string };

      // Validate expected values
      if (requestBody.actionType === "perform" && requestBody.parameters === "test-parameters") {
        return {
          pass: "WithBody",
          status: 200,
          body: json({
            result: "Action completed successfully with parameters",
          }),
        };
      } else {
        // Invalid request body values
        return {
          pass: "WithBody",
          status: 400,
          body: json({
            error:
              "Invalid request body values. Expected actionType: 'perform', parameters: 'test-parameters'",
          }),
        };
      }
    } else {
      // EmptyBody scenario - action completed without parameters
      return {
        pass: "EmptyBody",
        status: 200,
        body: json({
          result: "Action completed successfully",
        }),
      };
    }
  },
  kind: "MockApiDefinition",
});

// Provider POST action operation with optional body - test both with and without body
Scenarios.Azure_ResourceManager_OperationTemplates_OptionalBody_providerPost = withServiceKeys([
  "EmptyBody",
  "WithBody",
]).pass({
  uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/providerPost",
  method: "post",
  request: {
    pathParams: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
  },
  handler: (req: MockRequest) => {
    // Check if request has a body with content
    if (req.body && Object.keys(req.body).length > 0) {
      // WithBody scenario - validate request body values
      const requestBody = req.body as { totalAllowed?: number; reason?: string };

      // Validate expected values
      if (requestBody.totalAllowed === 100 && requestBody.reason === "Increased demand") {
        return {
          pass: "WithBody",
          status: 200,
          body: json({
            totalAllowed: requestBody.totalAllowed,
            status: "Changed to requested allowance",
          }),
        };
      } else {
        // Invalid request body values
        return {
          pass: "WithBody",
          status: 400,
          body: json({
            error:
              "Invalid request body values. Expected totalAllowed: 100, reason: 'Increased demand'",
          }),
        };
      }
    } else {
      // EmptyBody scenario - use default allowance
      return {
        pass: "EmptyBody",
        status: 200,
        body: json({
          totalAllowed: 50,
          status: "Changed to default allowance",
        }),
      };
    }
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ResourceManager_OperationTemplates_LroPaging_postPagingLro = passOnSuccess([
  {
    // LRO POST initial request
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/products/default/postPagingLro",
    method: "post",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 202,
      headers: {
        "retry-after": 1,
        location: dyn`${dynItem("baseUrl")}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_location`,
      },
    },
    handler: (req: MockRequest) => {
      postPagingLroPollCount = 0;
      return {
        status: 202,
        headers: {
          "retry-after": 1,
          location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_location`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO POST poll intermediate/get final result
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_location",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
    },
    handler: (req: MockRequest) => {
      if (postPagingLroPollCount > 0) {
        const response = {
          ...validProductListResult,
          nextLink: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_location/nextPage?api-version=2023-12-01-preview`,
        };
        return {
          status: 200,
          body: json(response),
        };
      } else {
        postPagingLroPollCount += 1;
        return {
          status: 202,
          headers: {
            "retry-after": 1,
            location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_location`,
          },
        };
      }
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO POST paging next page
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_location/nextPage",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validProductListResultPage2),
    },
    kind: "MockApiDefinition",
  },
]);

// LRO Paging with request body (ArmResourceActionAsyncBase)
// Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/web/resource-manager/Microsoft.Web/AppService/AppServiceEnvironmentResource.tsp#L152-L163
let postPagingLroWithBodyPollCount = 0;

Scenarios.Azure_ResourceManager_OperationTemplates_LroPaging_postPagingLroWithBody = passOnSuccess([
  {
    // LRO POST initial request with body - returns 202 with body
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/products/default/postPagingLroWithBody",
    method: "post",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
      body: json({
        vnetId: "vnet1",
      }),
    },
    response: {
      status: 202,
      headers: {
        "retry-after": 1,
        location: dyn`${dynItem("baseUrl")}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_body_location`,
      },
      body: json({
        value: [],
      }),
    },
    handler: (req: MockRequest) => {
      postPagingLroWithBodyPollCount = 0;
      return {
        status: 202,
        headers: {
          "retry-after": 1,
          location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_body_location`,
        },
        body: json({
          value: [],
        }),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO POST poll intermediate/get final result
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_body_location",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
    },
    handler: (req: MockRequest) => {
      if (postPagingLroWithBodyPollCount > 0) {
        const response = {
          ...validProductListResult,
          nextLink: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_body_location/nextPage?api-version=2023-12-01-preview`,
        };
        return {
          status: 200,
          body: json(response),
        };
      } else {
        postPagingLroWithBodyPollCount += 1;
        return {
          status: 202,
          headers: {
            "retry-after": 1,
            location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_body_location`,
          },
        };
      }
    },
    kind: "MockApiDefinition",
  },
  {
    // LRO POST paging next page
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operations/lro_paging_post_body_location/nextPage",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validProductListResultPage2),
    },
    kind: "MockApiDefinition",
  },
]);

// GET LRO scenarios
// Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/cost-management/resource-manager/Microsoft.CostManagement/CostManagement/GenerateDetailedCostReportOperationResult.tsp#L33-L39
const validCostReport = {
  id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/costReports/report1`,
  name: "report1",
  type: "Azure.ResourceManager.OperationTemplates/costReports",
  properties: {
    downloadUrl: "https://storage.blob.core.windows.net/reports/report1.csv",
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

let getLroPollCount = 0;

Scenarios.Azure_ResourceManager_OperationTemplates_Lro_getLro = passOnSuccess([
  {
    // GET LRO initial request - returns 202 Accepted
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/costReports/:operationId",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        operationId: "report1",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 202,
      headers: {
        location: dyn`${dynItem("baseUrl")}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/get_lro_location`,
      },
    },
    handler: (req: MockRequest) => {
      getLroPollCount = 0;
      return {
        status: 202,
        headers: {
          location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/get_lro_location`,
        },
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // GET LRO poll intermediate/get final result
    uri: "/subscriptions/:subscriptionId/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/get_lro_location",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 202,
    },
    handler: (req: MockRequest) => {
      if (getLroPollCount > 0) {
        return {
          status: 200,
          body: json(validCostReport),
        };
      } else {
        getLroPollCount += 1;
        return {
          status: 202,
          headers: {
            location: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/locations/eastus/operationResults/get_lro_location`,
          },
        };
      }
    },
    kind: "MockApiDefinition",
  },
]);

// POST Pageable scenarios
// Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/dynatrace/Dynatrace.Management/MonitorResource.tsp#L77-L83
const validMonitoredResourceListPage1 = {
  value: [
    {
      id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Microsoft.Compute/virtualMachines/vm1`,
      sendingMetrics: true,
    },
  ],
};
const validMonitoredResourceListPage2 = {
  value: [
    {
      id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Microsoft.Compute/virtualMachines/vm2`,
      sendingMetrics: false,
    },
  ],
};

Scenarios.Azure_ResourceManager_OperationTemplates_Paging_postActionPaging = passOnSuccess([
  {
    // POST pageable initial request - returns first page
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/monitors/:monitorName/postActionPaging",
    method: "post",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        monitorName: "monitor1",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
      body: json({
        filter: "status eq 'active'",
      }),
    },
    response: {
      status: 200,
      body: json(validMonitoredResourceListPage1),
    },
    handler: (req: MockRequest) => {
      return {
        status: 200,
        body: json({
          ...validMonitoredResourceListPage1,
          nextLink: `${req.baseUrl}/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/monitors/monitor1/postActionPaging/nextPage?api-version=2023-12-01-preview`,
        }),
      };
    },
    kind: "MockApiDefinition",
  },
  {
    // POST pageable next page
    uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/monitors/:monitorName/postActionPaging/nextPage",
    method: "get",
    request: {
      pathParams: {
        subscriptionId: SUBSCRIPTION_ID_EXPECTED,
        resourceGroup: RESOURCE_GROUP_EXPECTED,
        monitorName: "monitor1",
      },
      query: {
        "api-version": "2023-12-01-preview",
      },
    },
    response: {
      status: 200,
      body: json(validMonitoredResourceListPage2),
    },
    kind: "MockApiDefinition",
  },
]);

// markAsPageable scenarios
// Based on: https://github.com/Azure/azure-rest-api-specs/blob/89ff93230e/specification/marketplace/resource-manager/Microsoft.Marketplace/Marketplace/client.tsp#L286
const validCollectionsList = {
  value: [
    {
      id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/monitors/monitor1/collections/collection1`,
      name: "collection1",
      type: "Azure.ResourceManager.OperationTemplates/monitors/collections",
      properties: {
        displayName: "Test Collection",
      },
    },
    {
      id: `/subscriptions/${SUBSCRIPTION_ID_EXPECTED}/resourceGroups/${RESOURCE_GROUP_EXPECTED}/providers/Azure.ResourceManager.OperationTemplates/monitors/monitor1/collections/collection2`,
      name: "collection2",
      type: "Azure.ResourceManager.OperationTemplates/monitors/collections",
      properties: {
        displayName: "Another Collection",
      },
    },
  ],
};

Scenarios.Azure_ResourceManager_OperationTemplates_Paging_markAsPageable = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroup/providers/Azure.ResourceManager.OperationTemplates/monitors/:monitorName/collections",
  method: "get",
  request: {
    pathParams: {
      subscriptionId: SUBSCRIPTION_ID_EXPECTED,
      resourceGroup: RESOURCE_GROUP_EXPECTED,
      monitorName: "monitor1",
    },
    query: {
      "api-version": "2023-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validCollectionsList),
  },
  kind: "MockApiDefinition",
});
