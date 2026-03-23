import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Client_Scope_list = passOnSuccess({
  uri: "/client/scope/all",
  method: "get",
  request: {},
  response: {
    status: 200,
    body: json([{ name: "item1", value: 1 }]),
  },
  kind: "MockApiDefinition",
});

Scenarios.Client_Scope_create = passOnSuccess({
  uri: "/client/scope/scoped",
  method: "post",
  request: {
    body: json({ name: "item1", value: 1 }),
  },
  response: {
    status: 200,
    body: json({ name: "item1", value: 1 }),
  },
  kind: "MockApiDefinition",
});
