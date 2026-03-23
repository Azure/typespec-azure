import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ResponseAsBool_Exists = passOnSuccess([
  {
    uri: "/azure/client-generator-core/response-as-bool/exists/sample",
    method: "head",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);
