import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Scenario 3: Move to root client - Mock responses
Scenarios.Azure_ClientGenerator_Core_ClientLocation_MoveToRootClient_ResourceOperations =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-location/move-to-root-client/resource",
      method: "get",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-location/move-to-root-client/health",
      method: "get",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);
