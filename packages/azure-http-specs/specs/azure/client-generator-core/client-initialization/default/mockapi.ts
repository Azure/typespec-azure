import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

// Mock responses for HeaderParam scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_HeaderParam = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/header-param/with-query",
    method: "get",
    request: {
      query: {
        id: "test-id",
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
    uri: "/azure/client-generator-core/client-initialization/header-param/with-body",
    method: "post",
    request: {
      headers: {
        name: "test-name-value",
      },
      body: json({
        name: "test-name",
      }),
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

// Mock responses for MultipleParams scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_MultipleParams = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/multiple-params/with-query",
    method: "get",
    request: {
      query: {
        id: "test-id",
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
    uri: "/azure/client-generator-core/client-initialization/multiple-params/with-body",
    method: "post",
    request: {
      query: {
        region: "us-west",
      },
      headers: {
        name: "test-name-value",
      },
      body: json({
        name: "test-name",
      }),
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

// Mock responses for MixedParams scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_MixedParams = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/mixed-params/with-query",
    method: "get",
    request: {
      query: {
        id: "test-id",
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
    uri: "/azure/client-generator-core/client-initialization/mixed-params/with-body",
    method: "post",
    request: {
      query: {
        region: "us-west",
      },
      headers: {
        name: "test-name-value",
      },
      body: json({
        name: "test-name",
      }),
    },
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

// Mock responses for PathParam scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_PathParam = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/path/sample-blob/with-query",
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
    uri: "/azure/client-generator-core/client-initialization/path/sample-blob/get-standalone",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json({
        name: "sample-blob",
        size: 42,
        contentType: "text/plain",
        createdOn: "2025-04-01T12:00:00Z",
      }),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/client-initialization/path/sample-blob",
    method: "delete",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

// Mock responses for ParamAlias scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_ParamAlias = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/param-alias/sample-blob/with-aliased-name",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/client-initialization/param-alias/sample-blob/with-original-name",
    method: "get",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

// Mock responses for DefaultClient nested scenarios

// DefaultNestedWithPathClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_DefaultNestedWithPathClient = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/nested-default-default/test-resource/with-query",
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
    uri: "/azure/client-generator-core/client-initialization/nested-default-default/test-resource/get-standalone",
    method: "get",
    request: {},
    response: {
      status: 200,
      body: json({
        name: "test-resource",
        size: 42,
        contentType: "text/plain",
        createdOn: "2025-04-01T12:00:00Z",
      }),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/client-initialization/nested-default-default/test-resource",
    method: "delete",
    request: {},
    response: {
      status: 204,
    },
    kind: "MockApiDefinition",
  },
]);

// DefaultNestedWithQueryClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_DefaultNestedWithQueryClient = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-query/with-query",
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
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-query/get-standalone",
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
        size: 42,
        contentType: "text/plain",
        createdOn: "2025-04-01T12:00:00Z",
      }),
    },
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-query/delete-resource",
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

// DefaultNestedWithHeaderClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_DefaultNestedWithHeaderClient = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-header/with-query",
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
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-header/get-standalone",
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
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-header/delete-standalone",
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

// DefaultNestedWithMultipleClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_DefaultNestedWithMultipleClient = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-multiple/with-query",
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
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-multiple/get-standalone",
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
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-multiple/delete-standalone",
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

// DefaultNestedWithMixedClient scenario
Scenarios.Azure_ClientGenerator_Core_ClientInitialization_DefaultClient_DefaultNestedWithMixedClient = passOnSuccess([
  {
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-mixed/with-query",
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
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-mixed/get-standalone",
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
    uri: "/azure/client-generator-core/client-initialization/nested-default-default-mixed/delete-standalone",
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
