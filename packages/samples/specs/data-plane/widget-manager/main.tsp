import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using Http;
using Rest;
using Versioning;
using Azure.Core;
using Azure.Core.Traits;

@service(#{ title: "Contoso Widget Manager" })
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

@doc("The color of a widget.")
union WidgetColor {
  string,

  @doc("Black")
  Black: "Black",

  @doc("White")
  White: "White",

  @doc("Red")
  Red: "Red",

  @doc("Green")
  Green: "Green",

  @doc("Blue")
  Blue: "Blue",
}

@doc("A widget.")
@resource("widgets")
model Widget {
  @key("widgetName")
  @doc("The widget name.")
  @visibility(Lifecycle.Read)
  name: string;

  @doc("The widget color.")
  color: WidgetColor;

  @doc("The ID of the widget's manufacturer.")
  manufacturerId: string;

  ...EtagProperty;
}

@doc("The repair state of a widget.")
@lroStatus
union WidgetRepairState {
  string,

  @doc("Widget repairs succeeded.")
  Succeeded: "Succeeded",

  @doc("Widget repairs failed.")
  Failed: "Failed",

  @doc("Widget repairs were canceled.")
  Canceled: "Canceled",

  @doc("Widget was sent to the manufacturer.")
  SentToManufacturer: "SentToManufacturer",
}

@doc("A submitted repair request for a widget.")
model WidgetRepairRequest {
  @doc("The state of the widget repair request.")
  requestState: WidgetRepairState;

  @doc("The date and time when the repair is scheduled to occur.")
  scheduledDateTime: utcDateTime;

  @doc("The date and time when the request was created.")
  createdDateTime: utcDateTime;

  @doc("The date and time when the request was updated.")
  updatedDateTime: utcDateTime;

  @doc("The date and time when the request was completed.")
  completedDateTime: utcDateTime;
}

@doc("The parameters for a widget status request")
model WidgetRepairStatusParams {
  @doc("The ID of the widget being repaired.")
  @path
  widgetId: string;
}

@doc("A widget's part.")
@resource("parts")
@parentResource(Widget)
model WidgetPart {
  @key("widgetPartName")
  @doc("The name of the part.")
  @visibility(Lifecycle.Read)
  name: string;

  @doc("The ID to use for reordering the part.")
  partId: string;

  @doc("The ID of the part's manufacturer.")
  manufacturerId: string;

  ...EtagProperty;
}

@doc("The details of a reorder request for a WidgetPart.")
model WidgetPartReorderRequest {
  @doc("Identifies who signed off the reorder request.")
  signedOffBy: string;
}

// An example of a singleton resource
@doc("Provides analytics about the use and maintenance of a Widget.")
@resource("analytics")
@parentResource(Widget)
model WidgetAnalytics {
  @key("analyticsId")
  @doc("The identifier for the analytics object.  There is only one named 'current'.")
  @visibility(Lifecycle.Read)
  id: "current";

  @doc("The number of uses of the widget.")
  useCount: int64;

  @doc("The number of times the widget was repaired.")
  repairCount: int64;
}

@doc("A manufacturer of widgets.")
@resource("manufacturers")
model Manufacturer {
  @key("manufacturerId")
  @doc("The manufacturer's unique ID.")
  @visibility(Lifecycle.Read)
  id: string;

  @doc("The manufacturer's name.")
  name: string;

  @doc("The manufacturer's full address.")
  address: string;

  ...EtagProperty;
}

// Operations ////////////////////

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

interface Widgets {
  // Operation Status
  @doc("Gets status of a Widget operation.")
  @sharedRoute
  getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;
  @doc("Gets status of a Widget delete operation.")
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

  // Widget Analytics
  @doc("Get a WidgetAnalytics")
  getAnalytics is Operations.ResourceRead<WidgetAnalytics>;

  @doc("Creates or updates a WidgetAnalytics")
  updateAnalytics is Operations.ResourceCreateOrUpdate<WidgetAnalytics>;

  // Widget Repair Operations
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a custom operation status endpoint."
  @doc("Get the status of a WidgetRepairRequest.")
  @route("/widgets/{widgetId}/repairs/{operationId}")
  getRepairStatus is Foundations.GetOperationStatus<WidgetRepairStatusParams, WidgetRepairRequest>;

  @doc("Schedule a widget for repairs.")
  @pollingOperation(Widgets.getRepairStatus)
  scheduleRepairs is Operations.LongRunningResourceAction<
    Widget,
    WidgetRepairRequest,
    WidgetRepairRequest & RequestIdResponseHeader
  >;
}

interface WidgetParts {
  @doc("Gets status of a WidgetPart operation.")
  getWidgetPartReorderOperationStatus is Operations.GetResourceOperationStatus<WidgetPart, never>;

  @doc("Creates a WidgetPart")
  createWidgetPart is Operations.ResourceCreateWithServiceProvidedName<WidgetPart>;

  @doc("Get a WidgetPart")
  getWidgetPart is Operations.ResourceRead<WidgetPart>;

  @doc("Delete a WidgetPart")
  deleteWidgetPart is Operations.ResourceDelete<WidgetPart>;

  @doc("List WidgetPart resources")
  listWidgetParts is Operations.ResourceList<WidgetPart>;

  @doc("Reorder all parts for the widget.")
  @pollingOperation(WidgetParts.getWidgetPartReorderOperationStatus)
  reorderParts is Operations.LongRunningResourceCollectionAction<
    WidgetPart,
    WidgetPartReorderRequest,
    never
  >;
}

interface Manufacturers {
  @doc("Gets status of a Manufacturer delete operation.")
  getManufacturerDeleteOperationStatus is Operations.GetResourceOperationStatus<
    Manufacturer,
    never
  >;

  @doc("Creates or replaces a Manufacturer")
  createOrReplaceManufacturer is Operations.ResourceCreateOrReplace<Manufacturer>;

  @doc("Get a Manufacturer")
  getManufacturer is Operations.ResourceRead<Manufacturer>;

  @doc("Delete a Manufacturer asynchronously.")
  @pollingOperation(Manufacturers.getManufacturerDeleteOperationStatus)
  deleteManufacturer is Operations.LongRunningResourceDelete<Manufacturer>;

  @doc("List Manufacturer resources")
  listManufacturers is Operations.ResourceList<Manufacturer>;
}

// A "global" RPC operation
@route("service-status")
@doc("Responds with status information about the overall service.")
op getServiceStatus is RpcOperation<
  {},
  {
    statusString: string;
  },
  ServiceTraits
>;
