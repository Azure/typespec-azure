import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ResponseAsBool_HeadAsBoolean = passOnSuccess([
  {
    uri: "/azure/client-generator-core/response-as-bool/exists",
    method: "head",
    request: {
      query: {
        name: "exists-resource",
      },
    },
    response: {
      status: 200,
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/response-as-bool/exists/not",
    method: "head",
    request: {
      query: {
        name: "not-exists-resource",
      },
    },
    response: {
      status: 404,
    },
    kind: "MockApiDefinition",
  },
]);
