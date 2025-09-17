import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Mock responses for ParentNestedWithPathClient scenario
Scenarios.Azure_ClientGeneratorCore_ClientInitialization_DefaultParentClient_ParentNestedWithPathClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent/test-resource/with-query",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent/test-resource/get-standalone",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent/test-resource",
      method: "delete",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

// Mock responses for ParentNestedWithQueryClient scenario
Scenarios.Azure_ClientGeneratorCore_ClientInitialization_DefaultParentClient_ParentNestedWithQueryClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-query/with-query",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-query/get-standalone",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-query/delete-resource",
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

// Mock responses for ParentNestedWithHeaderClient scenario
Scenarios.Azure_ClientGeneratorCore_ClientInitialization_DefaultParentClient_ParentNestedWithHeaderClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-header/with-query",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-header/get-standalone",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-header/delete-standalone",
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

// Mock responses for ParentNestedWithMultipleClient scenario
Scenarios.Azure_ClientGeneratorCore_ClientInitialization_DefaultParentClient_ParentNestedWithMultipleClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-multiple/with-query",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-multiple/get-standalone",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-multiple/delete-standalone",
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

// Mock responses for ParentNestedWithMixedClient scenario
Scenarios.Azure_ClientGeneratorCore_ClientInitialization_DefaultParentClient_ParentNestedWithMixedClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-mixed/with-query",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-mixed/get-standalone",
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
      uri: "/azure/client-generator-core/client-initialization/nested-default-parent-mixed/delete-standalone",
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
