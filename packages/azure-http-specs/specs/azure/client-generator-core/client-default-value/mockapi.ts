import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios._Specs__Azure_ClientGenerator_Core_ClientDefaultValue_putModelProperty = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-default-value/model-property",
    method: "put",
    request: {
      body: {
        name: "test",
      },
    },
    response: {
      status: 200,
      body: {
        json: {
          name: "test",
          timeout: 30,
          tier: "standard",
          retry: true,
        },
      },
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios._Specs__Azure_ClientGenerator_Core_ClientDefaultValue_getOperationParameter = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-default-value/operation-parameter",
    method: "get",
    request: {
      params: {
        name: "test",
        pageSize: "10",
        format: "json",
      },
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios._Specs__Azure_ClientGenerator_Core_ClientDefaultValue_getPathParameter = passOnSuccess([
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
