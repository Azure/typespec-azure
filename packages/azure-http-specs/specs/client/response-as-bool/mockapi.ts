import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Client_ResponseAsBool_exists = passOnSuccess({
  uri: "/client/response-as-bool/exists",
  method: "head",
  request: {},
  response: {
    status: 200,
  },
  kind: "MockApiDefinition",
});

Scenarios.Client_ResponseAsBool_notExists = passOnSuccess({
  uri: "/client/response-as-bool/not-exists",
  method: "head",
  request: {},
  response: {
    status: 404,
  },
  kind: "MockApiDefinition",
});
