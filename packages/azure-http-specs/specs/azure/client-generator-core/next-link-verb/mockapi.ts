import { dyn, dynItem, json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_ClientGenerator_Core_NextLinkVerb_listItems = passOnSuccess([
  {
    // First page request
    uri: "/azure/client-generator-core/next-link-verb/items",
    method: "post",
    request: {},
    response: {
      status: 200,
      body: json({
        tests: [
          {
            id: "test1",
          },
        ],
        next: dyn`${dynItem("baseUrl")}/azure/client-generator-core/next-link-verb/items/page/2`,
      }),
    },
    kind: "MockApiDefinition",
  },
  {
    // Second page request
    uri: "/azure/client-generator-core/next-link-verb/items/page/2",
    method: "post",
    request: {},
    response: {
      status: 200,
      body: json({
        tests: [
          {
            id: "test2",
          },
        ],
      }),
    },
    kind: "MockApiDefinition",
  },
]);
