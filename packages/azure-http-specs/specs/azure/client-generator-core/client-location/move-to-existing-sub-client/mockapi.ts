import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Scenario 1: Move to existing sub client - Mock responses
Scenarios.Azure_ClientGenerator_Core_ClientLocation_MoveToExistingSubClient_UserOperations =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-location/move-to-existing-sub-client/user",
      method: "get",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-location/move-to-existing-sub-client/user",
      method: "delete",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-location/move-to-existing-sub-client/admin",
      method: "get",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);
