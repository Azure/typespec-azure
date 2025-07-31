import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_EnumNameConflict_FirstOperations_first = passOnSuccess({
  uri: "/azure/client-generator-core/enum-name-conflict/first",
  method: "post",
  request: {
    body: json({ status: "active", name: "test" }),
    headers: {
      "Content-Type": "application/json",
    },
  },
  response: {
    status: 200,
    body: json({ status: "active", name: "test" }),
    headers: {
      "Content-Type": "application/json",
    },
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_ClientGenerator_Core_EnumNameConflict_SecondOperations_second = passOnSuccess({
  uri: "/azure/client-generator-core/enum-name-conflict/second",
  method: "post",
  request: {
    body: json({ status: "running", description: "test description" }),
    headers: {
      "Content-Type": "application/json",
    },
  },
  response: {
    status: 200,
    body: json({ status: "running", description: "test description" }),
    headers: {
      "Content-Type": "application/json",
    },
  },
  kind: "MockApiDefinition",
});