import { json, passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ResourceManager_Example = passOnSuccess({
  uri: "/subscriptions/:subscriptionId/resourceGroups/:resourceGroupName/providers/Microsoft.Example/widgets",
  method: "get",
  request: {
    pathParams: {
      subscriptionId: "00000000-0000-0000-0000-000000000000",
      resourceGroupName: "test-rg",
    },
    query: {
      "api-version": "2022-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json({
      value: [
        {
          id: "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Example/widgets/widget",
          name: "widget",
          type: "Microsoft.Example/widgets",
          properties: {
            description: "sample widget",
          },
        },
      ],
    }),
  },
  kind: "MockApiDefinition",
});
