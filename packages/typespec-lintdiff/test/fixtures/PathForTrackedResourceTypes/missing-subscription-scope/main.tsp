// Test: missing-subscription-scope
// Violation: Tracked resource (with location) is modeled at tenant scope instead of RG scope.

import "../../lib/imports.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.ResourceManager;

@armProviderNamespace
@service(#{ title: "Test Service" })
@versioned(Versions)
@armCommonTypesVersion(CommonTypes.Versions.v5)
namespace Microsoft.TestService;

enum Versions {
  @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2024_01_01: "2024-01-01",
}

@doc("A tracked widget with a top-level location property")
model Widget {
  @doc("The widget name")
  name: string;

  @doc("The Azure location for the widget")
  location: string;

  @doc("Widget resource properties")
  properties?: WidgetProperties;
}

@doc("Widget resource properties.")
model WidgetProperties {
  @doc("Description")
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Raw op to test tracked resource path scope"
@route("/providers/Microsoft.TestService/widgets/{widgetName}")
@doc("Create a widget at tenant scope")
@put op createBadWidget(
  @path @doc("The widget name") widgetName: string,
  ...ApiVersionParameter,
  @bodyRoot @doc("The request body") body: Widget,
): Widget | ErrorResponse;

#suppress "@azure-tools/typespec-azure-core/operation-missing-api-version" "Raw op to test tracked resource path scope"
@route("/providers/Microsoft.TestService/widgets/{widgetName}")
@doc("Get a widget at tenant scope")
@get op getBadWidget(
  @path @doc("The widget name") widgetName: string,
  ...ApiVersionParameter,
): Widget | ErrorResponse;
