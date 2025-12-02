import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Service_MultiService_Combined_FirstService = passOnSuccess({
  uri: "/aTest",
  method: "post",
  request: {
    query: {
      "api-version": "av2",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Service_MultiService_Combined_SecondService = passOnSuccess({
  uri: "/bTest",
  method: "post",
  request: {
    query: {
      "api-version": "bv2",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
