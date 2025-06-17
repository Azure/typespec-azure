import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Scenario 1: Move to existing group - Mock responses
Scenarios.Azure_ClientGenerator_Core_ClientLocation_MoveToExistingGroup = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-location/a1",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/client-location/a2",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/client-location/b",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

// Scenario 2: Move to new group - Mock responses
Scenarios.Azure_ClientGenerator_Core_ClientLocation_MoveToNewGroup = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-location/move-to-new/a1",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/client-location/move-to-new/a2",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

// Scenario 3: Move to root client - Mock responses
Scenarios.Azure_ClientGenerator_Core_ClientLocation_MoveToRootClient = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-location/move-to-root/a1",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/client-location/move-to-root/a2",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);