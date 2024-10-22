import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;
using Azure.Core.Traits;

@service({
  title: "Contoso Widget Manager",
})
@versioned(Contoso.WidgetManager.Versions)
@useAuth(ApiKeyAuth<ApiKeyLocation.header, "X-Key">)
namespace Contoso.WidgetManager;

@doc("The Contoso Widget Manager service version.")
enum Versions {
  @doc("Version 2022-08-31")
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  `2022-08-31`,
}

// Models ////////////////////

@doc("A widget.")
@resource("widgets")
model Widget {
  @key("widgetName")
  @doc("The widget name.")
  @visibility("read")
  name: string;

  @doc("The ID of the widget's manufacturer.")
  manufacturerId: string;

  ...EtagProperty;
}

@error
@doc("A custom error type for the Widget Manager service.")
model WidgetServiceErrorResponse {
  @doc("The numeric error code.")
  code: int32;

  @doc("The error message.")
  errorMessage: string;
}

// Operations ////////////////////

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits, WidgetServiceErrorResponse>;

interface Widgets {
  // Operation Status
  @doc("Gets status of a Widget operation.")
  @sharedRoute
  getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;
  /** Gets the status of a Widget delete operation */
  @sharedRoute
  getWidgetDeleteOperationStatus is Operations.GetResourceOperationStatus<Widget, never>;

  // Widget Operations
  @doc("Creates or updates a Widget asynchronously")
  @pollingOperation(Widgets.getWidgetOperationStatus)
  createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;

  @doc("Get a Widget")
  getWidget is Operations.ResourceRead<Widget>;

  @doc("Delete a Widget asynchronously.")
  @pollingOperation(Widgets.getWidgetDeleteOperationStatus)
  deleteWidget is Operations.LongRunningResourceDelete<Widget>;

  @doc("List Widget resources")
  listWidgets is Operations.ResourceList<
    Widget,
    ListQueryParametersTrait<StandardListQueryParameters & SelectQueryParameter>
  >;
}
