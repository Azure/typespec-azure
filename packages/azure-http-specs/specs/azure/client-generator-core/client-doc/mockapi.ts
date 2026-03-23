import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ClientDoc_ReplaceDoc = passOnSuccess({
  uri: "/azure/client-generator-core/client-doc/replaceDoc/get",
  method: "get",
  request: {},
  response: {
    status: 200,
    body: json({ name: "sample" }),
  },
  kind: "MockApiDefinition",
});
