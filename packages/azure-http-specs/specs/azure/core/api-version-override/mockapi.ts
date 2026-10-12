import { passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Core_ApiVersionOverride_LegacyClient_get = passOnSuccess({
  uri: "/azure/core/api-version-override/legacy",
  method: "get",
  request: {
    query: {
      "api-version": "2022-10-01",
    },
  },
  response: {
    status: 200,
  },
  kind: "MockApiDefinition",
});
