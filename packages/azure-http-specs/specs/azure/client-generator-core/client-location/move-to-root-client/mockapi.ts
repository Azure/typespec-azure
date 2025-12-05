import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Scenario 3: Move to root client - Mock responses
Scenarios.Azure_ClientGenerator_Core_ClientLocation_MoveToRootClient_ResourceOperations =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-location/resource",
      method: "get",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-location/health",
      method: "get",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);
