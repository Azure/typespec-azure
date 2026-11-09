import { json, passOnSuccess, type ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ResourceManager_Example = passOnSuccess({
  uri: "/providers/Microsoft.Example/operations",
  method: "get",
  request: {
    query: {
      "api-version": "2022-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json({
      value: [
        {
          name: "Microsoft.Example/widgets/read",
          isDataAction: false,
        },
      ],
    }),
  },
  kind: "MockApiDefinition",
});
