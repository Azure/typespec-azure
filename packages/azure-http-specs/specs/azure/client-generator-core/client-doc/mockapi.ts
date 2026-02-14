import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ClientDoc_getReplace = passOnSuccess({
  uri: "/azure/client-generator-core/client-doc/replace",
  method: "get",
  request: {
    query: {
      name: "test",
    },
  },
  response: {
    status: 200,
    body: json({ name: "test" }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ClientGenerator_Core_ClientDoc_getAppend = passOnSuccess({
  uri: "/azure/client-generator-core/client-doc/append",
  method: "get",
  request: {
    query: {
      name: "test",
    },
  },
  response: {
    status: 200,
    body: json({ name: "test" }),
  },
  kind: "MockApiDefinition",
});
