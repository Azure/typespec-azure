// Test: inconsistent-shared-path-methods
// Violation: One inconsistent route shared by multiple HTTP methods is reported once.

import "@typespec/http";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Versioning;
using Azure.Core;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "api-key">)
@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("Detailed widget information.")
model WidgetDetails {
  @doc("Additional widget details.")
  info: string;
}

interface Widgets {
  @route("/widgets/{name}")
  @doc("Get a widget.")
  @get
  getWidget(
    @path @doc("The widget name.") name: string,
    @query("api-version") @doc("The API version.") apiVersion: string,
  ): WidgetDetails;

  @route("/widgets/{widgetId}/details")
  @doc("Get widget details.")
  @get
  getWidgetDetails(
    @path @doc("The widget identifier.") widgetId: string,
    @query("api-version") @doc("The API version.") apiVersion: string,
  ): WidgetDetails;

  @route("/widgets/{widgetId}/details")
  @doc("Delete widget details.")
  @delete
  deleteWidgetDetails(
    @path @doc("The widget identifier.") widgetId: string,
    @query("api-version") @doc("The API version.") apiVersion: string,
  ): void;
}
