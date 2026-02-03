import { json, MockApiDefinition, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};
function createMockApiDefinitions(route: string, request: any, response: any): MockApiDefinition {
  return {
    uri: `/azure/client-generator-core/flatten-property/${route}`,
    method: "put",
    request: {
      body: json(request),
    },
    response: {
      status: 200,
      body: json(response),
    },
    kind: "MockApiDefinition",
  };
}

Scenarios.Azure_ClientGenerator_Core_FlattenProperty_putFlattenModel = passOnSuccess(
  createMockApiDefinitions(
    "flattenModel",
    {
      name: "foo",
      properties: {
        description: "bar",
        age: 10,
      },
    },
    {
      name: "test",
      properties: {
        description: "test",
        age: 1,
      },
    },
  ),
);

Scenarios.Azure_ClientGenerator_Core_FlattenProperty_putNestedFlattenModel = passOnSuccess(
  createMockApiDefinitions(
    "nestedFlattenModel",
    {
      name: "foo",
      properties: {
        summary: "bar",
        properties: {
          description: "test",
          age: 10,
        },
      },
    },
    {
      name: "test",
      properties: {
        summary: "test",
        properties: {
          description: "foo",
          age: 1,
        },
      },
    },
  ),
);

Scenarios.Azure_ClientGenerator_Core_FlattenProperty_putFlattenUnknownModel = passOnSuccess(
  createMockApiDefinitions(
    "flattenUnknownModel",
    {
      name: "foo",
    },
    {
      name: "test",
      properties: {
        key1: "value1",
        key2: "value2",
      },
    },
  ),
);

Scenarios.Azure_ClientGenerator_Core_FlattenProperty_putFlattenReadOnlyModel = passOnSuccess(
  createMockApiDefinitions(
    "flattenReadOnlyModel",
    {
      name: "foo"
    },
    {
      name: "foo",
      solutionId: "solution1",
      title: "Solution Title",
      content: "Solution Content",
    },
  ),
);
