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

@doc("A manufacturer of widgets.")
@resource("manufacturers")
model Manufacturer {
  @key("manufacturerId")
  @doc("The manufacturer's unique ID.")
  @visibility("read")
  id: string;

  @doc("The manufacturer's name.")
  name: string;

  @doc("The manufacturer's full address.")
  address: string;

  ...EtagProperty;
}

// Operations ////////////////////

@doc("The ApiVersion path parameter.")
model ApiVersionPathParameter {
  @segment("api")
  @path("api-version")
  @doc("The API version to use for this operation.")
  apiVersion: string;
}

alias ServiceTraits = TraitOverride<VersionParameterTrait<ApiVersionPathParameter>> &
  SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

interface Widgets {
  // Operation Status
  @doc("Gets status of a Widget operation.")
  @sharedRoute
  getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;
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

interface Manufacturers {
  @doc("Gets status of a Manufacturer operation.")
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
#suppress "@azure-tools/typespec-azure-core/no-rpc-path-params" "The API version is part of the route path."
@route("/api/{api-version}/service-status")
@doc("Responds with status information about the overall service.")
op getServiceStatus is RpcOperation<
  {},
  {
    statusString: string;
  },
  ServiceTraits
>;
