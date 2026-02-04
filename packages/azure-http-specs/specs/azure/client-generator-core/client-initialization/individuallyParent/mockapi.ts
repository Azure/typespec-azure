import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Mock responses for IndividuallyParentClient scenarios
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyParentClient_IndividuallyParentNestedWithPathClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent/test-blob/with-query",
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
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent/test-blob/get-standalone",
      method: "get",
      request: {},
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
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent/test-blob",
      method: "delete",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);

Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyParentClient_IndividuallyParentNestedWithQueryClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-query/with-query",
      method: "get",
      request: {
        query: {
          blobName: "test-blob",
          format: "text",
        },
      },
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-query/get-standalone",
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
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-query/delete-resource",
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

Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyParentClient_IndividuallyParentNestedWithHeaderClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-header/with-query",
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
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-header/get-standalone",
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
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-header/delete-standalone",
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

Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyParentClient_IndividuallyParentNestedWithMultipleClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-multiple/with-query",
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
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-multiple/get-standalone",
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
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-multiple/delete-standalone",
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

Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyParentClient_IndividuallyParentNestedWithMixedClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-mixed/with-query",
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
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-mixed/get-standalone",
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
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-mixed/delete-standalone",
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

Scenarios.Azure_ClientGenerator_Core_ClientInitialization_IndividuallyParentClient_IndividuallyParentNestedWithParamAliasClient =
  passOnSuccess([
    {
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-param-alias/sample-blob/with-aliased-name",
      method: "get",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
    {
      uri: "/azure/client-generator-core/client-initialization/individually-parent/nested-default-individually-parent-param-alias/sample-blob/with-original-name",
      method: "get",
      request: {},
      response: {
        status: 204,
      },
      kind: "MockApiDefinition",
    },
  ]);
