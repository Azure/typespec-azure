import { json, MockRequest, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};
const validUser = { id: 1, name: "Madge", etag: "11bdc430-65e8-45ad-81d9-8ffa60d55b59" };

Scenarios.Azure_Core_Page_listWithPage = passOnSuccess({
  uri: "/azure/core/page/page",
  method: "get",
  request: {},
  response: { status: 200, body: json({ value: [validUser] }) },
  handler: (req: MockRequest) => {
    const responseBody = {
      value: [validUser],
    };
    return { status: 200, body: json(responseBody) };
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_Core_Page_listWithParameters = passOnSuccess({
  uri: "/azure/core/page/parameters",
  method: "get",
  request: {
    params: {
      another: "Second",
    },
    body: { inputName: "Madge" },
  },
  response: { status: 200, body: json({ value: [validUser] }) },
  handler: (req: MockRequest) => {
    req.expect.containsQueryParam("another", "Second");

    const validBody = { inputName: "Madge" };
    req.expect.bodyEquals(validBody);

    const responseBody = {
      value: [validUser],
    };
    return { status: 200, body: json(responseBody) };
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_Core_Page_TwoModelsAsPageItem = passOnSuccess([
  {
    uri: "/azure/core/page/first-item",
    method: "get",
    request: {},
    response: { status: 200, body: json({ value: [{ id: 1 }] }) },
    handler: (req: MockRequest) => {
      const responseBody = {
        value: [{ id: 1 }],
      };
      return { status: 200, body: json(responseBody) };
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/core/page/second-item",
    method: "get",
    request: {},
    response: { status: 200, body: json({ value: [{ name: "Madge" }] }) },
    handler: (req: MockRequest) => {
      const responseBody = {
        value: [{ name: "Madge" }],
      };
      return { status: 200, body: json(responseBody) };
    },
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_Core_Page_listWithCustomPageModel = passOnSuccess({
  uri: "/azure/core/page/custom-page",
  method: "get",
  request: {},
  response: { status: 200, body: json({ items: [validUser] }) },
  handler: (req: MockRequest) => {
    const responseBody = {
      items: [validUser],
    };
    return { status: 200, body: json(responseBody) };
  },
  kind: "MockApiDefinition",
});
