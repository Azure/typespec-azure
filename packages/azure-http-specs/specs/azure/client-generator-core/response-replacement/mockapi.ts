import { json, passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_ResponseReplacement_voidResponse = passOnSuccess({
  uri: "/azure/client-generator-core/response-replacement/void",
  method: "post",
  request: {},
  response: {
    status: 200,
    body: json({ name: "widget" }),
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ClientGenerator_Core_ResponseReplacement_bytesResponse = passOnSuccess({
  uri: "/azure/client-generator-core/response-replacement/bytes",
  method: "get",
  request: {},
  response: {
    status: 200,
    body: json({ name: "widget" }),
  },
  kind: "MockApiDefinition",
});
