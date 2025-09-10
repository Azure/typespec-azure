import { json, passOnSuccess, ScenarioMockApi } from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

const validWidget = { 
  id: "widget-123", 
  name: "Sample Widget", 
  etag: "11bdc430-65e8-45ad-81d9-8ffa60d55b59",
  color: "blue"
};

const validWidgetUpdated = { 
  id: "widget-123", 
  name: "Sample Widget", 
  etag: "22bdc430-65e8-45ad-81d9-8ffa60d55b5a",
  color: "red"
};

// Test @previewVersion with stable operations - should work across all versions
Scenarios.Azure_Versioning_PreviewVersion_getWidget = passOnSuccess({
  uri: "/azure/versioning/previewVersion/widgets/:id",
  method: "get",
  request: {
    pathParams: {
      id: "widget-123",
    },
    query: {
      "api-version": "2024-12-01-preview",
    },
  },
  response: {
    status: 200,
    body: json(validWidget),
  },
  kind: "MockApiDefinition",
});

// Test @previewVersion with preview-only operations - only available in preview version
Scenarios.Azure_Versioning_PreviewVersion_updateWidgetColor = passOnSuccess({
  uri: "/azure/versioning/previewVersion/widgets/:id/color",
  method: "post",
  request: {
    pathParams: {
      id: "widget-123",
    },
    query: {
      "api-version": "2024-12-01-preview",
    },
    body: json({
      color: "red",
    }),
  },
  response: {
    status: 200,
    body: json(validWidgetUpdated),
  },
  kind: "MockApiDefinition",
});

// Test @previewVersion with version-specific query parameters
Scenarios.Azure_Versioning_PreviewVersion_listWidgets = passOnSuccess({
  uri: "/azure/versioning/previewVersion/widgets",
  method: "get",
  request: {
    query: {
      "api-version": "2024-12-01-preview",
      name: "test",
      color: "blue",
    },
  },
  response: {
    status: 200,
    body: json({
      value: [
        {
          id: "widget-1",
          name: "test",
          etag: "33bdc430-65e8-45ad-81d9-8ffa60d55b5c",
          color: "blue",
        },
      ],
    }),
  },
  kind: "MockApiDefinition",
});