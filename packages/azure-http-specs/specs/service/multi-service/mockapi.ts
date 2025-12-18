import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Service_MultiService_ServiceA_AI_aTest = passOnSuccess({
  uri: "/service/multi-service/service-a/aTest",
  method: "get",
  request: {
    query: {
      "api-version": "av2",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Service_MultiService_ServiceB_BI_bTest = passOnSuccess({
  uri: "/service/multi-service/service-b/bTest",
  method: "get",
  request: {
    query: {
      "api-version": "bv2",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
