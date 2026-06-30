import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "@azure-tools/typespec-azure-core";

using Http;
using Rest;
using Versioning;
using Azure.Core;
using Azure.Core.Traits;

@service(#{ title: "Contoso Benchmark Widget Service" })
@versioned(Contoso.BenchmarkWidgets.Versions)
@useAuth(ApiKeyAuth<ApiKeyLocation.header, "X-Api-Key">)
namespace Contoso.BenchmarkWidgets;

enum Versions {
  `2024-01-01`,
}

// --- Models ---

union WidgetColor {
  string,
  Red: "Red",
  Green: "Green",
  Blue: "Blue",
  Yellow: "Yellow",
  Purple: "Purple",
}

union WidgetStatus {
  string,
  Active: "Active",
  Inactive: "Inactive",
  Maintenance: "Maintenance",
}

@resource("widgets")
model Widget {
  @key("widgetName")
  @visibility(Lifecycle.Read)
  name: string;

  displayName: string;
  color: WidgetColor;
  status: WidgetStatus;
  weight: float32;
  manufacturerId: string;
  createdAt: utcDateTime;
  updatedAt?: utcDateTime;
  tags?: Record<string>;
  ...EtagProperty;
}

@resource("parts")
@parentResource(Widget)
model WidgetPart {
  @key("partName")
  @visibility(Lifecycle.Read)
  name: string;

  serialNumber: string;
  category: string;
  weight: float32;
  supplier: string;
  installedAt: utcDateTime;
  ...EtagProperty;
}

@resource("inspections")
@parentResource(Widget)
model WidgetInspection {
  @key("inspectionId")
  @visibility(Lifecycle.Read)
  id: string;

  inspector: string;
  result: InspectionResult;
  notes?: string;
  inspectedAt: utcDateTime;
}

union InspectionResult {
  string,
  Passed: "Passed",
  Failed: "Failed",
  NeedsReview: "NeedsReview",
}

@resource("analytics")
@parentResource(Widget)
model WidgetAnalytics {
  @key("analyticsId")
  @visibility(Lifecycle.Read)
  id: "current";

  useCount: int64;
  errorCount: int64;
  lastUsedAt?: utcDateTime;
  averageResponseTimeMs: float64;
}

@lroStatus
union RepairState {
  string,
  Succeeded: "Succeeded",
  Failed: "Failed",
  Canceled: "Canceled",
  InProgress: "InProgress",
}

model RepairRequest {
  requestState: RepairState;
  description: string;
  priority: int32;
  scheduledAt: utcDateTime;
  createdAt: utcDateTime;
}

model RepairStatusParams {
  @path widgetId: string;
}

model BatchAnalysisRequest {
  widgetNames: string[];
  analysisType: string;
}

model BatchAnalysisResponse {
  results: Record<string>;
  completedAt: utcDateTime;
}

@resource("manufacturers")
model Manufacturer {
  @key("manufacturerId")
  @visibility(Lifecycle.Read)
  id: string;

  name: string;
  address: string;
  country: string;
  rating: float32;
  certifications: string[];
  ...EtagProperty;
}

// --- Operations ---

alias ServiceTraits = SupportsRepeatableRequests &
  SupportsConditionalRequests &
  SupportsClientRequestId;

alias Ops = Azure.Core.ResourceOperations<ServiceTraits>;

interface Widgets {
  @sharedRoute
  getWidgetOperationStatus is Ops.GetResourceOperationStatus<Widget>;

  @sharedRoute
  getWidgetDeleteOperationStatus is Ops.GetResourceOperationStatus<Widget, never>;

  @pollingOperation(Widgets.getWidgetOperationStatus)
  createOrUpdate is Ops.LongRunningResourceCreateOrUpdate<Widget>;

  get is Ops.ResourceRead<Widget>;

  @pollingOperation(Widgets.getWidgetDeleteOperationStatus)
  delete is Ops.LongRunningResourceDelete<Widget>;

  list is Ops.ResourceList<
    Widget,
    ListQueryParametersTrait<StandardListQueryParameters & SelectQueryParameter>
  >;

  getAnalytics is Ops.ResourceRead<WidgetAnalytics>;
  updateAnalytics is Ops.ResourceCreateOrUpdate<WidgetAnalytics>;

  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Custom operation status endpoint."
  @route("/widgets/{widgetId}/repairs/{operationId}")
  getRepairStatus is Azure.Core.Foundations.GetOperationStatus<RepairStatusParams, RepairRequest>;

  @pollingOperation(Widgets.getRepairStatus)
  scheduleRepairs is Ops.LongRunningResourceAction<Widget, RepairRequest, RepairRequest>;
}

interface WidgetParts {
  getPartOperationStatus is Ops.GetResourceOperationStatus<WidgetPart, never>;
  create is Ops.ResourceCreateWithServiceProvidedName<WidgetPart>;
  get is Ops.ResourceRead<WidgetPart>;
  delete is Ops.ResourceDelete<WidgetPart>;
  list is Ops.ResourceList<WidgetPart>;
}

interface WidgetInspections {
  create is Ops.ResourceCreateWithServiceProvidedName<WidgetInspection>;
  get is Ops.ResourceRead<WidgetInspection>;
  list is Ops.ResourceList<WidgetInspection>;
}

interface Manufacturers {
  getDeleteOperationStatus is Ops.GetResourceOperationStatus<Manufacturer, never>;
  createOrReplace is Ops.ResourceCreateOrReplace<Manufacturer>;
  get is Ops.ResourceRead<Manufacturer>;
  @pollingOperation(Manufacturers.getDeleteOperationStatus)
  delete is Ops.LongRunningResourceDelete<Manufacturer>;
  list is Ops.ResourceList<Manufacturer>;
}

@route("service-status")
op getServiceStatus is RpcOperation<
  {},
  {
    statusString: string;
    version: string;
    uptime: int64;
  },
  ServiceTraits
>;

@route("batch-analysis")
op batchAnalysis is RpcOperation<BatchAnalysisRequest, BatchAnalysisResponse, ServiceTraits>;
