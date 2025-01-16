import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ApiVersion_headerApiVersion = passOnSuccess([
  {
    uri: "/azure/client-generator-core/api-version/header",
    method: "post",
    request: {
      headers: {
        "x-ms-version": "1234",
      },
    },
    response: {
      status: 200,
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ClientGenerator_Core_ApiVersion_queryApiVersion = passOnSuccess([
  {
    uri: "/azure/client-generator-core/api-version/query",
    method: "post",
    request: {
      params: {
        version: "1234",
      },
    },
    response: {
      status: 200,
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ClientGenerator_Core_ApiVersion_pathApiVersion = passOnSuccess([
  {
    uri: "/azure/client-generator-core/api-version/path/1234",
    method: "post",
    request: {},
    response: {
      status: 200,
    },
    kind: "MockApiDefinition",
  },
]);
