import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ClientDefaultValue_putModelProperty = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-default-value/model-property",
    method: "put",
    request: {
      body: json({
        name: "test",
      }),
    },
    response: {
      status: 200,
      body: json({
        name: "test",
        timeout: 30,
        tier: "standard",
        retry: true,
      }),
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ClientGenerator_Core_ClientDefaultValue_getOperationParameter = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-default-value/operation-parameter",
    method: "get",
    request: {
      query: {
        name: "test",
        pageSize: 10,
        format: "json",
      },
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ClientGenerator_Core_ClientDefaultValue_getPathParameter = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-default-value/path-parameter/default-segment1/segment2",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_ClientGenerator_Core_ClientDefaultValue_getHeaderParameter = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-default-value/header-parameter",
    method: "get",
    request: {
      headers: {
        accept: "application/json;odata.metadata=none",
        "x-custom-header": "default-value",
      },
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);
