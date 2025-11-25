import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Parent scenario - the actual operations are tested individually below
Scenarios.Service_MultiService_Scenario = passOnSuccess([
  {
    uri: "/multi-service/first/one",
    method: "get",
    request: {
      query: {
        "api-version": "1.1.0",
      },
    },
    response: { status: 204 },
    kind: "MockApiDefinition",
  },
  {
    uri: "/multi-service/first/two",
    method: "get",
    request: {
      query: {
        "api-version": "1.1.0",
      },
    },
    response: { status: 204 },
    kind: "MockApiDefinition",
  },
  {
    uri: "/multi-service/second/one",
    method: "get",
    request: {
      query: {
        "api-version": "2.1.0",
      },
    },
    response: { status: 204 },
    kind: "MockApiDefinition",
  },
  {
    uri: "/multi-service/second/two",
    method: "get",
    request: {
      query: {
        "api-version": "2.1.0",
      },
    },
    response: { status: 204 },
    kind: "MockApiDefinition",
  },
]);
