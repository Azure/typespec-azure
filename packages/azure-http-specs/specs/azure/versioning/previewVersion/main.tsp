import "@typespec/spector";
import "@azure-tools/typespec-azure-core";
import "@azure-tools/typespec-client-generator-core";
import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";

using Azure.Core;
using global.Azure.Core.Traits;
using global.Azure.Core.Foundations;
using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Spector;

#suppress "@azure-tools/typespec-azure-core/casing-style" "For spec"
@doc("Testing @previewVersion decorator with Azure Core versioning")
@scenarioService(
  "/azure/versioning/previewVersion",
  {
    versioned: ApiVersions,
  }
)
namespace _Specs_.Azure.Versioning.PreviewVersion;

@doc("Supported api versions including preview.")
enum ApiVersions {
  @doc("Api version 2024-01-01.")
  @useDependency(global.Azure.Core.Versions.v1_0_Preview_2)
  v2024_01_01: "2024-01-01",
  
  @doc("Api version 2024-06-01.")
  @useDependency(global.Azure.Core.Versions.v1_0_Preview_2)
  v2024_06_01: "2024-06-01",
  
  @doc("Preview api version 2024-12-01-preview.")
  @useDependency(global.Azure.Core.Versions.v1_0_Preview_2)
  @Azure.Core.previewVersion
  v2024_12_01_preview: "2024-12-01-preview",
}

@resource("widgets")
@doc("A simple model for testing.")
model Widget {
  @key
  @doc("Widget identifier.")
  @visibility(Lifecycle.Read)
  id: string;
  
  @doc("Widget name.")
  name: string;
  
  @doc("Widget color, only available in preview version.")
  @added(ApiVersions.v2024_12_01_preview)
  color?: string;

  ...global.Azure.Core.EtagProperty;
}

alias ResourceOperations = global.Azure.Core.ResourceOperations<NoConditionalRequests &
  NoRepeatableRequests &
  NoClientRequestId>;

@scenario
@scenarioDoc("""
  Test @previewVersion decorator with stable operations.
  Should work across all API versions.
  
  Expected path parameter: id=widget-123
  Expected query parameter: api-version=2024-12-01-preview
  
  Expected response body:
  ```json
  {
    "id": "widget-123",
    "name": "Sample Widget",
    "color": "blue"
  }
  ```
  """)
@doc("Get widget by id (available in all versions)")
op getWidget is ResourceOperations.ResourceRead<Widget>;

@doc("Update widget color request.")
model UpdateWidgetColorRequest {
  @doc("New color for the widget.")
  color: string;
}

@scenario
@scenarioDoc("""
  Test @previewVersion decorator with preview-only operations.
  Only available in preview API versions.
  
  Expected path parameter: id=widget-123
  Expected query parameter: api-version=2024-12-01-preview
  
  Expected input body:
  ```json
  {
    "color": "red"
  }
  ```
  
  Expected response body:
  ```json
  {
    "id": "widget-123",
    "name": "Sample Widget", 
    "color": "red"
  }
  ```
  """)
@doc("Update widget color (preview only)")
@added(ApiVersions.v2024_12_01_preview)
op updateWidgetColor is ResourceOperations.ResourceAction<Widget, UpdateWidgetColorRequest, Widget>;

@scenario
@scenarioDoc("""
  Test @previewVersion decorator with version-specific query parameters.
  Should handle optional preview features gracefully.
  
  Expected query parameter: api-version=2024-12-01-preview
  Expected query parameter: name=test&color=blue (color only in preview)
  
  Expected response body:
  ```json
  {
    "value": [
      {
        "id": "widget-1",
        "name": "test",
        "color": "blue"
      }
    ]
  }
  ```
  """)
@doc("List widgets with optional color filtering")
op listWidgets is ResourceOperations.ResourceList<
  Widget,
  ListQueryParametersTrait<{
    @doc("Filter by widget name")
    @query 
    name?: string;
    
    @doc("Filter by widget color (preview only)")
    @query
    @added(ApiVersions.v2024_12_01_preview)
    color?: string;
  }>
>;