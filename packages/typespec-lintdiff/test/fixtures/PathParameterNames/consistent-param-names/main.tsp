// Test: consistent-param-names
// Violation: none. Reused segments keep the same parameter name.

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

@doc("A widget resource.")
model Widget {
  @doc("The displayed widget name.")
  name: string;
}

interface Widgets {
  @route("/widgets/{widgetName}")
  @doc("Get a widget.")
  @get
  op getWidget(
    @path @doc("The widget name.") widgetName: string,
    @query("api-version") @doc("The API version.") apiVersion: string,
  ): Widget;

  @route("/widgets/{widgetName}/details")
  @doc("Get widget details.")
  @get
  op getWidgetDetails(
    @path @doc("The widget name.") widgetName: string,
    @query("api-version") @doc("The API version.") apiVersion: string,
  ): Widget;

  @route("/gadgets/{gadgetId}")
  @doc("Get a gadget.")
  @get
  op getGadget(
    @path @doc("The gadget identifier.") gadgetId: string,
    @query("api-version") @doc("The API version.") apiVersion: string,
  ): Widget;
}
