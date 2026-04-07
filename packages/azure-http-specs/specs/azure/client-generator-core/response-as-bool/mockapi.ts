import { MockApiDefinition, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ResponseAsBool_Exists = passOnSuccess([
  {
    uri: `/azure/client-generator-core/response-as-bool/exists/found`,
    method: "head",
    request: {
      query: {
        name: "sample",
      },
    },
    response: {
      status: 200,
    },
    kind: "MockApiDefinition",
  } satisfies MockApiDefinition,
]);

Scenarios.Azure_ClientGenerator_Core_ResponseAsBool_NotExists = passOnSuccess([
  {
    uri: `/azure/client-generator-core/response-as-bool/exists/notFound`,
    method: "head",
    request: {
      query: {
        name: "sample",
      },
    },
    response: {
      status: 404,
    },
    kind: "MockApiDefinition",
  } satisfies MockApiDefinition,
]);
