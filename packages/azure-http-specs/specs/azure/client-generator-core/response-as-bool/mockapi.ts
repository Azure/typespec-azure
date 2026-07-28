import { passOnCode, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ResponseAsBool_HeadAsBoolean_exists = passOnSuccess({
  uri: "/azure/client-generator-core/response-as-bool/exists",
  method: "head",
  request: {},
  response: {
    status: 204,
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ClientGenerator_Core_ResponseAsBool_HeadAsBoolean_notExists = passOnCode(404, {
  uri: "/azure/client-generator-core/response-as-bool/exists/not-exists",
  method: "head",
  request: {},
  response: {
    status: 404,
  },
  kind: "MockApiDefinition",
});
