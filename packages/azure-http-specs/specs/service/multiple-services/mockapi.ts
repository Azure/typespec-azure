import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Service_MultipleServices_ServiceA_Operations_opA = passOnSuccess({
  uri: "/service/multiple-services/service-a/a-test",
  method: "get",
  request: {
    query: {
      "api-version": "av2",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Service_MultipleServices_ServiceA_SubNamespace_subOpA = passOnSuccess({
  uri: "/service/multiple-services/service-a/a-sub-test",
  method: "get",
  request: {
    query: {
      "api-version": "av2",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Service_MultipleServices_ServiceB_Operations_opB = passOnSuccess({
  uri: "/service/multiple-services/service-b/b-test",
  method: "get",
  request: {
    query: {
      "api-version": "bv2",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});

Scenarios.Service_MultipleServices_ServiceB_SubNamespace_subOpB = passOnSuccess({
  uri: "/service/multiple-services/service-b/b-sub-test",
  method: "get",
  request: {
    query: {
      "api-version": "bv2",
    },
  },
  response: { status: 204 },
  kind: "MockApiDefinition",
});
