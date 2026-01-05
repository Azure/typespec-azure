import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Mock data constants
const SUBSCRIPTION_ID = "00000000-0000-0000-0000-000000000000";
const RESOURCE_GROUP = "test-rg";

const virtualMachine = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachines/vm1`,
  name: "vm1",
  type: "Microsoft.Compute/virtualMachines",
  location: "eastus",
  properties: {
    provisioningState: "Succeeded",
    metadata: {
      createdAt: "2025-01-01T00:00:00Z",
      createdBy: "user@example.com",
      tags: {
        environment: "production",
      },
    },
  },
};

const storageAccount = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Storage/storageAccounts/account1`,
  name: "account1",
  type: "Microsoft.Storage/storageAccounts",
  location: "westus",
  properties: {
    provisioningState: "Succeeded",
    metadata: {
      createdAt: "2025-01-02T00:00:00Z",
      createdBy: "admin@example.com",
      tags: {
        department: "engineering",
      },
    },
  },
};

// Scenario: Get Virtual Machine
Scenarios.Azure_ResourceManager_MultiServiceSharedModels_Compute_VirtualMachines_get = passOnSuccess([
  {
    uri: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachines/vm1`,
    method: "get",
    request: {
      query: {
        "api-version": "2025-05-01",
      },
    },
    response: {
      status: 200,
      body: json(virtualMachine),
    },
    kind: "MockApiDefinition",
  },
]);

// Scenario: Create or Update Virtual Machine
Scenarios.Azure_ResourceManager_MultiServiceSharedModels_Compute_VirtualMachines_createOrUpdate = passOnSuccess(
  [
    {
      uri: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachines/vm1`,
      method: "put",
      request: {
        query: {
          "api-version": "2025-05-01",
        },
        body: json({
          location: "eastus",
          properties: {
            metadata: {
              createdBy: "user@example.com",
              tags: {
                environment: "production",
              },
            },
          },
        }),
      },
      response: {
        status: 200,
        body: json(virtualMachine),
      },
      kind: "MockApiDefinition",
    },
  ],
);

// Scenario: Get Storage Account
Scenarios.Azure_ResourceManager_MultiServiceSharedModels_Storage_StorageAccounts_get = passOnSuccess([
  {
    uri: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Storage/storageAccounts/account1`,
    method: "get",
    request: {
      query: {
        "api-version": "2025-02-01",
      },
    },
    response: {
      status: 200,
      body: json(storageAccount),
    },
    kind: "MockApiDefinition",
  },
]);

// Scenario: Create or Update Storage Account
Scenarios.Azure_ResourceManager_MultiServiceSharedModels_Storage_StorageAccounts_createOrUpdate = passOnSuccess([
  {
    uri: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Storage/storageAccounts/account1`,
    method: "put",
    request: {
      query: {
        "api-version": "2025-02-01",
      },
      body: json({
        location: "westus",
        properties: {
          metadata: {
            createdBy: "admin@example.com",
            tags: {
              department: "engineering",
            },
          },
        },
      }),
    },
    response: {
      status: 200,
      body: json(storageAccount),
    },
    kind: "MockApiDefinition",
  },
]);
