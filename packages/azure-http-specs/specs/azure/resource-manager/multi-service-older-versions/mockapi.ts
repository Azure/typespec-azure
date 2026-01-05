import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Mock data for Compute (VirtualMachine)
const SUBSCRIPTION_ID = "00000000-0000-0000-0000-000000000000";
const RESOURCE_GROUP = "test-rg";
const LOCATION = "eastus";

const virtualMachine = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachinesOld/vm-old1`,
  name: "vm-old1",
  type: "Microsoft.Compute/virtualMachinesOld",
  location: LOCATION,
  properties: {
    provisioningState: "Succeeded",
  },
};

// Mock data for ComputeDisk (Disk)
const disk = {
  id: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/disksOld/disk-old1`,
  name: "disk-old1",
  type: "Microsoft.Compute/disksOld",
  location: LOCATION,
  properties: {
    provisioningState: "Succeeded",
  },
};

// Scenario: Get Virtual Machine
Scenarios.Azure_ResourceManager_MultiServiceOlderVersions_Compute_VirtualMachines_get = passOnSuccess([
  {
    uri: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachinesOld/vm-old1`,
    method: "get",
    request: {
      query: {
        "api-version": "2024-11-01",
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
Scenarios.Azure_ResourceManager_MultiServiceOlderVersions_Compute_VirtualMachines_createOrUpdate = passOnSuccess(
  [
    {
      uri: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachinesOld/vm-old1`,
      method: "put",
      request: {
        query: {
          "api-version": "2024-11-01",
        },
        body: json({
          location: LOCATION,
          properties: {},
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

// Scenario: Get Disk
Scenarios.Azure_ResourceManager_MultiServiceOlderVersions_ComputeDisk_Disks_get = passOnSuccess([
  {
    uri: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/disksOld/disk-old1`,
    method: "get",
    request: {
      query: {
        "api-version": "2024-03-02",
      },
    },
    response: {
      status: 200,
      body: json(disk),
    },
    kind: "MockApiDefinition",
  },
]);

// Scenario: Create or Update Disk
Scenarios.Azure_ResourceManager_MultiServiceOlderVersions_ComputeDisk_Disks_createOrUpdate = passOnSuccess([
  {
    uri: `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/disksOld/disk-old1`,
    method: "put",
    request: {
      query: {
        "api-version": "2024-03-02",
      },
      body: json({
        location: LOCATION,
        properties: {},
      }),
    },
    response: {
      status: 200,
      body: json(disk),
    },
    kind: "MockApiDefinition",
  },
]);
