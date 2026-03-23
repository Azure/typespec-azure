import { passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ParamAlias_download = passOnSuccess({
  uri: "/azure/client-generator-core/param-alias/download/sample",
  method: "get",
  request: {},
  response: {
    status: 200,
    body: {
      contentType: "application/octet-stream",
      rawContent: "hello",
    },
  },
  kind: "MockApiDefinition",
});
