import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Scenario 2: Move to new sub client - Mock responses
Scenarios.Azure_ClientGenerator_Core_ClientLocation_MoveToNewSubClient_ProductOperations = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-location/products",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/client-location/products/archive",
    method: "post",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);
