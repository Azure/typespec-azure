import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkClientType, SdkHeaderParameter, SdkHttpOperation } from "../../src/interfaces.js";
import { isAzureCoreModel } from "../../src/public-utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "../utils.js";

describe("Azure Widget Service", () => {
  let runnerWithCore: SdkTestRunner;

  beforeEach(async () => {
    runnerWithCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core", "Azure.Core.Traits"],
      emitterName: "@azure-tools/typespec-java",
    });
  });
  async function compileAzureWidgetService(runner: SdkTestRunner, code: string) {
    return await runner.compile(`
  @useAuth(
    ApiKeyAuth<ApiKeyLocation.header, "api-key"> | OAuth2Auth<[
      {
        type: OAuth2FlowType.implicit,
        authorizationUrl: "https://login.contoso.com/common/oauth2/v2.0/authorize",
        scopes: ["https://widget.contoso.com/.default"],
      }
    ]>
  )
  @service(#{
    title: "Contoso Widget Manager",
  })
  @server(
    "{endpoint}/widget",
    "Contoso Widget APIs",
    {
      @doc("""
  Supported Widget Services endpoints (protocol and hostname, for example:
  https://westus.api.widget.contoso.com).
  """)
      endpoint: string,
    }
  )
  @versioned(Contoso.WidgetManager.Versions)
  namespace Contoso.WidgetManager;

  @doc("The Contoso Widget Manager service version.")
  enum Versions {
    @doc("Version 2022-08-31")
    @useDependency(Azure.Core.Versions.v1_0_Preview_2)
    "2022-08-30",
  }

  // Models ////////////////////

  @doc("The color of a widget.")
  enum WidgetColor {
    @doc("Black")
    Black,

    @doc("White")
    White,

    @doc("Red")
    Red,

    @doc("Green")
    Green,

    @doc("Blue")
    Blue,
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
  enum WidgetRepairState {
    @doc("Widget repairs succeeded.")
    Succeeded,

    @doc("Widget repairs failed.")
    Failed,

    @doc("Widget repairs were canceled.")
    Canceled,

    @doc("Widget was sent to the manufacturer.")
    SentToManufacturer,
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
    @doc("The identifier for the analytics object.")
    @visibility(Lifecycle.Read)
    id: string;

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

  @route("/widgets")
  @tag("Widgets")
  interface Widgets {
    ${code}
  }`);
  }

  it("getWidget", async () => {
    await compileAzureWidgetService(
      runnerWithCore,
      `
    @doc("Get a Widget")
    getWidget is Operations.ResourceRead<Widget>;
    `,
    );
    const sdkPackage = runnerWithCore.context.sdkPackage;
    const parentClient = sdkPackage.clients.filter((c) => c.initialization.access === "public")[0];
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(parentClient.name, "WidgetManagerClient");
    strictEqual(method.name, "getWidget");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 7);

    // TODO: what should we do with eTags and client request id?
    const methodWidgetName = method.parameters.find((p) => p.name === "widgetName");
    ok(methodWidgetName);
    strictEqual(methodWidgetName.kind, "method");
    strictEqual(methodWidgetName.isApiVersionParam, false);
    deepStrictEqual(methodWidgetName.apiVersions, ["2022-08-30"]);
    strictEqual(methodWidgetName.onClient, false);
    strictEqual(methodWidgetName.optional, false);

    strictEqual(method.operation.parameters.length, 8);

    const pathParam = method.operation.parameters.find((x) => x.kind === "path");
    ok(pathParam);
    strictEqual(pathParam.kind, "path");
    strictEqual(pathParam.name, "widgetName");
    strictEqual(pathParam.serializedName, "widgetName");
    strictEqual(pathParam.onClient, false);
    strictEqual(pathParam.correspondingMethodParams.length, 1);
    strictEqual(pathParam.correspondingMethodParams[0], methodWidgetName);

    const queryParam = method.operation.parameters.find((x) => x.kind === "query");
    ok(queryParam);
    strictEqual(queryParam.isApiVersionParam, true);
    strictEqual(queryParam.name, "apiVersion");
    strictEqual(queryParam.serializedName, "api-version");
    strictEqual(queryParam.onClient, true);
    strictEqual(
      queryParam.correspondingMethodParams[0],
      parentClient.initialization.properties.find((x) => x.isApiVersionParam),
    );
    ok(parentClient.initialization);
    strictEqual(
      queryParam.correspondingMethodParams[0],
      parentClient.initialization.properties.find((x) => x.isApiVersionParam),
    );

    const methodAcceptParam = method.parameters.find((x) => x.name === "accept");
    ok(methodAcceptParam);
    strictEqual(methodAcceptParam.clientDefaultValue, undefined);
    strictEqual(methodAcceptParam.onClient, false);
    strictEqual(methodAcceptParam.optional, false);

    const headerParams = method.operation.parameters.filter(
      (x): x is SdkHeaderParameter => x.kind === "header",
    );
    strictEqual(headerParams.length, 6);

    const operationAcceptParam = headerParams.find((x) => x.serializedName === "Accept");
    ok(operationAcceptParam);
    strictEqual(operationAcceptParam.clientDefaultValue, undefined);
    strictEqual(operationAcceptParam.onClient, false);
    strictEqual(operationAcceptParam.optional, false);
    strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);

    strictEqual(
      method.parameters.some((x) => x.name === "contentType"),
      false,
    );
    strictEqual(
      headerParams.some((x) => x.serializedName === "Content-Type"),
      false,
    );
  });
  it("poll widget", async () => {
    await compileAzureWidgetService(
      runnerWithCore,
      `
    @doc("Gets status of a Widget operation.")
    getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;

    @doc("Creates or updates a Widget asynchronously")
    @pollingOperation(Widgets.getWidgetOperationStatus)
    createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;
    `,
    );
    const sdkPackage = runnerWithCore.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);
    const parentClient = sdkPackage.clients[0];
    const client = parentClient.methods.find((x) => x.kind === "clientaccessor")
      ?.response as SdkClientType<SdkHttpOperation>;
    ok(client);
    strictEqual(client.methods.length, 2);

    // TEST GET STATUS
    const getStatus = client.methods.find((x) => x.name === "getWidgetOperationStatus");
    ok(getStatus);
    strictEqual(getStatus.name, "getWidgetOperationStatus");
    strictEqual(getStatus.kind, "basic");
    strictEqual(
      getStatus.crossLanguageDefinitionId,
      "Contoso.WidgetManager.Widgets.getWidgetOperationStatus",
    );
    strictEqual(getStatus.parameters.length, 3);

    const methodWidgetName = getStatus.parameters.find((p) => p.name === "widgetName");
    ok(methodWidgetName);
    strictEqual(methodWidgetName.kind, "method");
    strictEqual(methodWidgetName.isApiVersionParam, false);
    deepStrictEqual(methodWidgetName.apiVersions, ["2022-08-30"]);
    strictEqual(methodWidgetName.onClient, false);
    strictEqual(methodWidgetName.optional, false);

    const methodOperationId = getStatus.parameters.find((p) => p.name === "operationId");
    ok(methodOperationId);
    strictEqual(methodOperationId.kind, "method");
    strictEqual(methodOperationId.isApiVersionParam, false);
    deepStrictEqual(methodOperationId.apiVersions, ["2022-08-30"]);
    strictEqual(methodOperationId.onClient, false);
    strictEqual(methodOperationId.optional, false);

    const methodAcceptParam = getStatus.parameters.find((x) => x.name === "accept");
    ok(methodAcceptParam);
    strictEqual(methodAcceptParam.clientDefaultValue, undefined);
    strictEqual(methodAcceptParam.onClient, false);
    strictEqual(methodAcceptParam.optional, false);

    strictEqual(getStatus.operation.parameters.length, 4);

    const pathParams = getStatus.operation.parameters.filter((x) => x.kind === "path");
    strictEqual(pathParams.length, 2);

    const pathParam1 = pathParams[0];
    strictEqual(pathParam1.kind, "path");
    strictEqual(pathParam1.name, "widgetName");
    strictEqual(pathParam1.serializedName, "widgetName");
    strictEqual(pathParam1.onClient, false);
    strictEqual(pathParam1.correspondingMethodParams.length, 1);
    strictEqual(pathParam1.correspondingMethodParams[0], methodWidgetName);

    const pathParam2 = pathParams[1];
    strictEqual(pathParam2.kind, "path");
    strictEqual(pathParam2.name, "operationId");
    strictEqual(pathParam2.serializedName, "operationId");
    strictEqual(pathParam2.onClient, false);
    strictEqual(pathParam2.correspondingMethodParams.length, 1);
    strictEqual(pathParam2.correspondingMethodParams[0], methodOperationId);

    const apiVersionParam = getStatus.operation.parameters.find((x) => x.kind === "query");
    ok(apiVersionParam);
    strictEqual(apiVersionParam.isApiVersionParam, true);
    strictEqual(apiVersionParam.name, "apiVersion");
    strictEqual(apiVersionParam.serializedName, "api-version");
    strictEqual(apiVersionParam.onClient, true);
    strictEqual(apiVersionParam.correspondingMethodParams.length, 1);
    ok(parentClient.initialization);
    strictEqual(
      apiVersionParam.correspondingMethodParams[0],
      parentClient.initialization.properties.find((x) => x.isApiVersionParam),
    );

    const operationAcceptParam = getStatus.operation.parameters.find((x) => x.kind === "header");
    ok(operationAcceptParam);
    strictEqual(operationAcceptParam.name, "accept");
    strictEqual(operationAcceptParam.clientDefaultValue, undefined);
    strictEqual(operationAcceptParam.onClient, false);
    strictEqual(operationAcceptParam.optional, false);
    strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);

    const widgetModel = sdkPackage.models.find((x) => x.name === "Widget");

    // TEST POLLING
    const createOrUpdate = client.methods.find((x) => x.name === "createOrUpdateWidget");
    ok(createOrUpdate);
    strictEqual(createOrUpdate.kind, "lro");
    strictEqual(createOrUpdate.parameters.length, 11);
    strictEqual(
      createOrUpdate.crossLanguageDefinitionId,
      "Contoso.WidgetManager.Widgets.createOrUpdateWidget",
    );
    deepStrictEqual(createOrUpdate.parameters.map((x) => x.name).sort(), [
      "accept",
      "clientRequestId",
      "contentType",
      "ifMatch",
      "ifModifiedSince",
      "ifNoneMatch",
      "ifUnmodifiedSince",
      "repeatabilityFirstSent",
      "repeatabilityRequestId",
      "resource",
      "widgetName",
    ]);

    const serviceOperation = createOrUpdate.operation;
    strictEqual(serviceOperation.verb, "patch");
    const headerParams = serviceOperation.parameters.filter(
      (x): x is SdkHeaderParameter => x.kind === "header",
    );
    deepStrictEqual(headerParams.map((x) => x.name).sort(), [
      "accept",
      "clientRequestId",
      "contentType",
      "ifMatch",
      "ifModifiedSince",
      "ifNoneMatch",
      "ifUnmodifiedSince",
      "repeatabilityFirstSent",
      "repeatabilityRequestId",
    ]);
    strictEqual(headerParams.length, 9);
    const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
    ok(pathParam);
    strictEqual(pathParam.serializedName, "widgetName");
    const queryParam = serviceOperation.parameters.find((x) => x.kind === "query");
    ok(queryParam);
    strictEqual(queryParam.serializedName, "api-version");
    ok(serviceOperation.bodyParam);
    strictEqual(serviceOperation.bodyParam.name, "resource");
    strictEqual(serviceOperation.bodyParam.type, widgetModel);

    strictEqual(serviceOperation.responses.length, 2);
    const responseHeaders = [
      "Repeatability-Result",
      "ETag",
      "x-ms-client-request-id",
      "Operation-Location",
    ];
    const response200 = serviceOperation.responses.find((x) => x.statusCodes === 200);
    ok(response200);
    deepStrictEqual(
      response200.headers.map((x) => x.serializedName),
      responseHeaders,
    );
    strictEqual(response200.type, widgetModel);

    const response201 = serviceOperation.responses.find((x) => x.statusCodes === 201);
    ok(response201);
    deepStrictEqual(
      response201.headers.map((x) => x.serializedName),
      responseHeaders,
    );
    strictEqual(response201.type, widgetModel);

    const exception = serviceOperation.exceptions.find((x) => x.statusCodes === "*");
    ok(exception);
    strictEqual(exception.kind, "http");
    ok(exception.type);
    strictEqual(exception.type.kind, "model");
    strictEqual(exception.type.crossLanguageDefinitionId, "Azure.Core.Foundations.ErrorResponse");
    ok(
      sdkPackage.models.find(
        (x) =>
          x.crossLanguageDefinitionId === "Azure.Core.Foundations.ErrorResponse" &&
          isAzureCoreModel(x),
      ),
    );
    const methodResponse = createOrUpdate.response;
    strictEqual(methodResponse.kind, "method");
    strictEqual(methodResponse.type, widgetModel);
    strictEqual(createOrUpdate.response.resultPath, "result");
    strictEqual(createOrUpdate.response.resultSegments?.length, 1);
    strictEqual(
      createOrUpdate.response.resultSegments[0],
      createOrUpdate.lroMetadata.finalResponse?.envelopeResult.properties[3],
    );
  });
  it("lro delete", async () => {
    await compileAzureWidgetService(
      runnerWithCore,
      `
      op delete is ResourceOperations.LongRunningResourceDelete<Widget>;
      `,
    );
    const method = getServiceMethodOfClient(runnerWithCore.context.sdkPackage);
    strictEqual(method.name, "delete");
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type, undefined);
    strictEqual(runnerWithCore.context.sdkPackage.models.length, 3);
    strictEqual(
      runnerWithCore.context.sdkPackage.models.filter((x) => !isAzureCoreModel(x)).length,
      0,
    );
    strictEqual(runnerWithCore.context.sdkPackage.enums.length, 2);
    strictEqual(
      runnerWithCore.context.sdkPackage.enums.filter((x) => !isAzureCoreModel(x)).length,
      1,
    );
  });
  it("paging", async () => {
    await compileAzureWidgetService(
      runnerWithCore,
      `
      @doc("List Manufacturer resources")
      listManufacturers is Operations.ResourceList<Manufacturer>;
    `,
    );
    const sdkPackage = runnerWithCore.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);
    strictEqual(sdkPackage.models.length, 5);
    strictEqual(sdkPackage.models.filter((x) => !isAzureCoreModel(x)).length, 1);
    const manufacturerModel = sdkPackage.models.find(
      (x) => !isAzureCoreModel(x) && x.name === "Manufacturer",
    );
    ok(manufacturerModel);
    const widgetClient = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
      ?.response as SdkClientType<SdkHttpOperation>;
    ok(widgetClient);

    strictEqual(widgetClient.initialization.properties.length, 3);
    const apiVersionClientParam = widgetClient.initialization.properties.find(
      (x) => x.isApiVersionParam,
    );
    ok(apiVersionClientParam);

    strictEqual(widgetClient.initialization.access, "internal");
    strictEqual(widgetClient.methods.length, 1);
    const listManufacturers = widgetClient.methods[0];

    strictEqual(listManufacturers.name, "listManufacturers");
    strictEqual(
      listManufacturers.crossLanguageDefinitionId,
      "Contoso.WidgetManager.Widgets.listManufacturers",
    );
    strictEqual(listManufacturers.kind, "paging");
    strictEqual(listManufacturers.parameters.length, 2);
    deepStrictEqual(listManufacturers.parameters.map((x) => x.name).sort(), [
      "accept",
      "clientRequestId",
    ]);
    const methodResponse = listManufacturers.response.type;
    ok(methodResponse);
    strictEqual(methodResponse.kind, "array");
    deepStrictEqual(methodResponse.valueType, manufacturerModel);

    const operation = listManufacturers.operation;
    strictEqual(operation.kind, "http");
    strictEqual(operation.verb, "get");
    strictEqual(operation.parameters.length, 3);

    const apiVersion = operation.parameters.find((x) => x.isApiVersionParam);
    ok(apiVersion);
    strictEqual(apiVersion.kind, "query");
    strictEqual(apiVersion.name, "apiVersion");
    strictEqual(apiVersion.serializedName, "api-version");
    strictEqual(apiVersion.onClient, true);
    strictEqual(apiVersion.correspondingMethodParams[0], apiVersionClientParam);

    const clientRequestId = operation.parameters.find((x) => x.name === "clientRequestId");
    ok(clientRequestId);
    strictEqual(clientRequestId.kind, "header");
    strictEqual(clientRequestId.correspondingMethodParams[0], listManufacturers.parameters[0]);

    const accept = operation.parameters.find((x) => x.name === "accept");
    ok(accept);
    strictEqual(accept.kind, "header");
    strictEqual(accept.correspondingMethodParams[0], listManufacturers.parameters[1]);

    strictEqual(operation.responses.length, 1);
    const response200 = operation.responses.find((x) => x.statusCodes === 200);
    ok(response200);
    strictEqual(response200.kind, "http");
    const pagingModel = response200.type;
    ok(pagingModel);
    strictEqual(pagingModel.kind, "model");
    strictEqual(pagingModel.name, "PagedManufacturer");
    strictEqual(pagingModel.properties.length, 3);

    const valueProperty = pagingModel.properties.find((x) => x.name === "value");
    ok(valueProperty);
    strictEqual(valueProperty.kind, "property");
    strictEqual(valueProperty.type.kind, "array");
    strictEqual(valueProperty.type.valueType, manufacturerModel);

    const nextLinkProperty = pagingModel.properties.find((x) => x.name === "nextLink");
    ok(nextLinkProperty);
    strictEqual(nextLinkProperty.kind, "property");
    strictEqual(nextLinkProperty.type.kind, "url");
    strictEqual(nextLinkProperty.type.name, "ResourceLocation");
    strictEqual(nextLinkProperty.type.crossLanguageDefinitionId, "TypeSpec.Rest.ResourceLocation");
    strictEqual(nextLinkProperty.type.baseType?.kind, "url");
    strictEqual(nextLinkProperty.serializedName, "nextLink");
    strictEqual(nextLinkProperty.serializedName, listManufacturers.nextLinkPath);

    const clientRequestIdProperty = pagingModel.properties.find(
      (x) => x.name === "clientRequestId",
    );
    ok(clientRequestIdProperty);
    strictEqual(clientRequestIdProperty.kind, "header");
  });

  it("getWidgetAnalytics", async () => {
    await compileAzureWidgetService(
      runnerWithCore,
      `
    @doc("Get a WidgetAnalytics")
    getWidgetAnalytics is Operations.ResourceRead<WidgetAnalytics>;
    `,
    );
    const sdkPackage = runnerWithCore.context.sdkPackage;
    const parentClient = sdkPackage.clients.filter((c) => c.initialization.access === "public")[0];
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(parentClient.name, "WidgetManagerClient");
    strictEqual(method.name, "getWidgetAnalytics");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 8);

    const methodWidgetName = method.parameters.find((p) => p.name === "widgetName");
    ok(methodWidgetName);
    strictEqual(methodWidgetName.kind, "method");
    strictEqual(methodWidgetName.isApiVersionParam, false);
    deepStrictEqual(methodWidgetName.apiVersions, ["2022-08-30"]);
    strictEqual(methodWidgetName.onClient, false);
    strictEqual(methodWidgetName.optional, false);

    const operationWidgetName = method.operation.parameters.find((x) => x.name === "widgetName");
    ok(operationWidgetName);
    strictEqual(operationWidgetName.kind, "path");
    strictEqual(operationWidgetName.name, "widgetName");
    strictEqual(operationWidgetName.serializedName, "widgetName");
    strictEqual(operationWidgetName.onClient, false);
    strictEqual(operationWidgetName.correspondingMethodParams.length, 1);
    strictEqual(operationWidgetName.correspondingMethodParams[0], methodWidgetName);

    const methodAnalyticsId = method.parameters.find((p) => p.name === "analyticsId");
    ok(methodAnalyticsId);
    strictEqual(methodAnalyticsId.kind, "method");
    strictEqual(methodAnalyticsId.isApiVersionParam, false);
    deepStrictEqual(methodAnalyticsId.apiVersions, ["2022-08-30"]);
    strictEqual(methodAnalyticsId.onClient, false);
    strictEqual(methodAnalyticsId.optional, false);

    const operationAnalyticsId = method.operation.parameters.find((x) => x.name === "analyticsId");
    ok(operationAnalyticsId);
    strictEqual(operationAnalyticsId.kind, "path");
    strictEqual(operationAnalyticsId.name, "analyticsId");
    strictEqual(operationAnalyticsId.serializedName, "analyticsId");
    strictEqual(operationAnalyticsId.onClient, false);
    strictEqual(operationAnalyticsId.correspondingMethodParams.length, 1);
    strictEqual(operationAnalyticsId.correspondingMethodParams[0], methodAnalyticsId);
  });
});
