import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ApiVersion_ClientApiVersions_sendApiVersion = passOnSuccess([
  {
    uri: "/azure/client-generator-core/api-version/client-api-versions",
    method: "post",
    request: {
      query: {
        "api-version": "2022-10-01",
      },
    },
    response: {
      status: 200,
    },
    kind: "MockApiDefinition",
  },
]);
