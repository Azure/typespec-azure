import { json, MockApiDefinition, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function createMockApiDefinition(route: string): MockApiDefinition {
  return {
    uri: `/azure/client-generator-core/scope/${route}`,
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json({ name: "sample" }),
    },
    kind: "MockApiDefinition",
  };
}

Scenarios.Azure_ClientGenerator_Core_Scope_ScopedOperation = passOnSuccess([
  createMockApiDefinition("scopedOp"),
]);

Scenarios.Azure_ClientGenerator_Core_Scope_NegatedScopeOperation = passOnSuccess([
  createMockApiDefinition("negatedOp"),
]);
