import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

Scenarios.Azure_Core_Model_AzureCoreEmbeddingVector_get = passOnSuccess({
  uri: "/azure/core/model/embeddingVector",
  method: "get",
  request: {},
  response: { status: 200, body: json([0, 1, 2, 3, 4]) },
  handler: (req) => {
    return { status: 200, body: json([0, 1, 2, 3, 4]) };
  },
  kind: "MockApiDefinition",
});

Scenarios.Azure_Core_Model_AzureCoreEmbeddingVector_put = passOnSuccess({
  uri: "/azure/core/model/embeddingVector",
  method: "put",
  request: {
    body: [0, 1, 2, 3, 4],
  },
  response: { status: 204 },
  handler: (req) => {
    req.expect.bodyEquals([0, 1, 2, 3, 4]);
    return { status: 204 };
  },
  kind: "MockApiDefinition",
});

const responseBody = { embedding: [5, 6, 7, 8, 9] };
Scenarios.Azure_Core_Model_AzureCoreEmbeddingVector_post = passOnSuccess({
  uri: "/azure/core/model/embeddingVector",
  method: "post",
  request: { body: { embedding: [0, 1, 2, 3, 4] } },
  response: { status: 200, body: json(responseBody) },
  handler: (req) => {
    req.expect.bodyEquals({ embedding: [0, 1, 2, 3, 4] });
    return {
      status: 200,
      body: json(responseBody),
    };
  },
  kind: "MockApiDefinition",
});
