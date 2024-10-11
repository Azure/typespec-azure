import { json, MockRequest, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Client_AzureExampleClient_basicAction = passOnSuccess({
  uri: "/azure/example/basic/basic",
  method: "post",
  request: {
    params: {
      "api-version": "2022-12-01-preview",
      "query-param": "query",
    },
    headers: {
      "header-param": "header",
    },
    body: {
      stringProperty: "text",
      modelProperty: {
        int32Property: 1,
        float32Property: 1.5,
        enumProperty: "EnumValue1",
      },
      arrayProperty: ["item"],
      recordProperty: {
        record: "value",
      },
    },
  },
  response: {
    status: 200,
    body: json({
      stringProperty: "text",
    }),
  },
  handler: (req: MockRequest) => {
    req.expect.containsQueryParam("api-version", "2022-12-01-preview");
    req.expect.containsQueryParam("query-param", "query");
    req.expect.containsHeader("header-param", "header");
    const validBody = {
      stringProperty: "text",
      modelProperty: {
        int32Property: 1,
        float32Property: 1.5,
        enumProperty: "EnumValue1",
      },
      arrayProperty: ["item"],
      recordProperty: {
        record: "value",
      },
    };
    req.expect.bodyEquals(validBody);
    return {
      status: 200,
      body: json({
        stringProperty: "text",
      }),
    };
  },
  kind: "MockApiDefinition",
});
