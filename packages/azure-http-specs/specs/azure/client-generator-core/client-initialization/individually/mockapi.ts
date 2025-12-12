import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Mock responses for IndividuallyNestedWithPathClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_IndividuallyNestedWithPathClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually/test-resource/with-query",
      method: "get",
      request: {
        query: {
          format: "text",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually/test-resource/get-standalone",
      method: "get",
      request: {},
      response: {
        status: 200,
        body: json({
          name: "test-resource",
          size: 1024,
          contentType: "application/octet-stream",
          createdOn: "2023-01-01T12:00:00Z",
        }),
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually/test-resource",
      method: "delete",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

// Mock responses for IndividuallyNestedWithQueryClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_IndividuallyNestedWithQueryClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-query/with-query",
      method: "get",
      request: {
        query: {
          blobName: "test-blob",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-query/get-standalone",
      method: "get",
      request: {
        query: {
          blobName: "test-blob",
        },
      },
      response: {
        status: 200,
        body: json({
          name: "test-blob",
          size: 1024,
          contentType: "application/octet-stream",
          createdOn: "2023-01-01T12:00:00Z",
        }),
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-query/delete-resource",
      method: "delete",
      request: {
        query: {
          blobName: "test-blob",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

// Mock responses for IndividuallyNestedWithHeaderClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_IndividuallyNestedWithHeaderClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-header/with-query",
      method: "get",
      request: {
        query: {
          format: "text",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-header/get-standalone",
      method: "get",
      request: {
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-header/delete-standalone",
      method: "delete",
      request: {
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

// Mock responses for IndividuallyNestedWithMultipleClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_IndividuallyNestedWithMultipleClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-multiple/with-query",
      method: "get",
      request: {
        query: {
          format: "text",
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-multiple/get-standalone",
      method: "get",
      request: {
        query: {
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-multiple/delete-standalone",
      method: "delete",
      request: {
        query: {
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

// Mock responses for IndividuallyNestedWithMixedClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_IndividuallyNestedWithMixedClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-mixed/with-query",
      method: "get",
      request: {
        query: {
          format: "text",
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-mixed/get-standalone",
      method: "get",
      request: {
        query: {
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-mixed/delete-standalone",
      method: "delete",
      request: {
        query: {
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

// Additional mock responses for IndividuallyClient scenarios
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyClient_IndividuallyNestedWithPathClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually/test-resource/with-query",
      method: "get",
      request: {
        query: {
          format: "text",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually/test-resource/get-standalone",
      method: "get",
      request: {},
      response: {
        status: 200,
        body: json({
          name: "test-resource",
          size: 1024,
          contentType: "application/octet-stream",
          createdOn: "2023-01-01T12:00:00Z",
        }),
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually/test-resource",
      method: "delete",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyClient_IndividuallyNestedWithQueryClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-query/with-query",
      method: "get",
      request: {
        query: {
          blobName: "test-blob",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-query/get-standalone",
      method: "get",
      request: {
        query: {
          blobName: "test-blob",
        },
      },
      response: {
        status: 200,
        body: json({
          name: "test-blob",
          size: 1024,
          contentType: "application/octet-stream",
          createdOn: "2023-01-01T12:00:00Z",
        }),
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-query/delete-resource",
      method: "delete",
      request: {
        query: {
          blobName: "test-blob",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyClient_IndividuallyNestedWithHeaderClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-header/with-query",
      method: "get",
      request: {
        query: {
          format: "text",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-header/get-standalone",
      method: "get",
      request: {
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-header/delete-standalone",
      method: "delete",
      request: {
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyClient_IndividuallyNestedWithMultipleClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-multiple/with-query",
      method: "get",
      request: {
        query: {
          format: "text",
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-multiple/get-standalone",
      method: "get",
      request: {
        query: {
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-multiple/delete-standalone",
      method: "delete",
      request: {
        query: {
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyClient_IndividuallyNestedWithMixedClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-mixed/with-query",
      method: "get",
      request: {
        query: {
          format: "text",
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-mixed/get-standalone",
      method: "get",
      request: {
        query: {
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-individually-mixed/delete-standalone",
      method: "delete",
      request: {
        query: {
          region: "us-west",
        },
        headers: {
          name: "test-name-value",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);
