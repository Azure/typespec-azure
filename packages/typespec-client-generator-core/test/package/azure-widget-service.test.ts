import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { InitializedByFlags, SdkHeaderParameter } from "../../src/interfaces.js";
import { isAzureCoreModel } from "../../src/public-utils.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

async function compileAzureWidgetService(code: string) {
  return await AzureCoreTester.compile(`
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
      endpoint: string,
    }
  )
  @versioned(Contoso.WidgetManager.Versions)
  namespace Contoso.WidgetManager;

  
  enum Versions {
    
      "2022-08-30",
  }

  // Models ////////////////////

  
  enum WidgetColor {
    
    Black,

    
    White,

    
    Red,

    
    Green,

    
    Blue,
  }

  
  @resource("widgets")
  model Widget {
    @key("widgetName")
    
    @visibility(Lifecycle.Read)
    name: string;

    
    color: WidgetColor;

    
    manufacturerId: string;

    ...EtagProperty;
  }

  
  @lroStatus
  enum WidgetRepairState {
    
    Succeeded,

    
    Failed,

    
    Canceled,

    
    SentToManufacturer,
  }

  
  model WidgetRepairRequest {
    
    requestState: WidgetRepairState;

    
    scheduledDateTime: utcDateTime;

    
    createdDateTime: utcDateTime;

    
    updatedDateTime: utcDateTime;

    
    completedDateTime: utcDateTime;
  }

  
  model WidgetRepairStatusParams {
    
    @path
    widgetId: string;
  }

  
  @resource("parts")
  @parentResource(Widget)
  model WidgetPart {
    @key("widgetPartName")
    
    @visibility(Lifecycle.Read)
    name: string;

    
    partId: string;

    
    manufacturerId: string;

    ...EtagProperty;
  }

  
  model WidgetPartReorderRequest {
    
    signedOffBy: string;
  }

  // An example of a singleton resource
  
  @resource("analytics")
  @parentResource(Widget)
  model WidgetAnalytics {
    @key("analyticsId")
    
    @visibility(Lifecycle.Read)
    id: string;

    
    useCount: int64;

    
    repairCount: int64;
  }

  
  @resource("manufacturers")
  model Manufacturer {
    @key("manufacturerId")
    
    @visibility(Lifecycle.Read)
    id: string;

    
    name: string;

    
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
  const { program } = await compileAzureWidgetService(
    `
    
    getWidget is Operations.ResourceRead<Widget>;
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const parentClient = sdkPackage.clients.filter(
    (c) => c.clientInitialization.initializedBy & InitializedByFlags.Individually,
  )[0];
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
    parentClient.clientInitialization.parameters.find((x) => x.isApiVersionParam),
  );
  strictEqual(
    queryParam.correspondingMethodParams[0],
    parentClient.clientInitialization.parameters.find((x) => x.isApiVersionParam),
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
  const { program } = await compileAzureWidgetService(
    `
    
    getWidgetOperationStatus is Operations.GetResourceOperationStatus<Widget>;

    
    @pollingOperation(Widgets.getWidgetOperationStatus)
    #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
    createOrUpdateWidget is Operations.LongRunningResourceCreateOrUpdate<Widget>;
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const parentClient = sdkPackage.clients[0];
  const client = parentClient.children?.[0];
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
  strictEqual(
    apiVersionParam.correspondingMethodParams[0],
    parentClient.clientInitialization.parameters.find((x) => x.isApiVersionParam),
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
  strictEqual(createOrUpdate.response.resultSegments?.length, 1);
  strictEqual(createOrUpdate.lroMetadata.finalResponse?.envelopeResult.kind, "model");
  strictEqual(
    createOrUpdate.response.resultSegments[0],
    createOrUpdate.lroMetadata.finalResponse?.envelopeResult.properties[3],
  );
});
it("lro delete", async () => {
  const { program } = await compileAzureWidgetService(
    `
      op delete is Operations.LongRunningResourceDelete<Widget>;
      `,
  );
  const context = await createSdkContextForTester(program);
  const method = getServiceMethodOfClient(context.sdkPackage);
  strictEqual(method.name, "delete");
  strictEqual(method.kind, "lro");
  strictEqual(method.response.type, undefined);
  strictEqual(context.sdkPackage.models.length, 4);
  strictEqual(context.sdkPackage.models.filter((x) => !isAzureCoreModel(x)).length, 0);
  strictEqual(context.sdkPackage.enums.length, 3);
  strictEqual(context.sdkPackage.enums.filter((x) => !isAzureCoreModel(x)).length, 1);
});
it("paging", async () => {
  const { program } = await compileAzureWidgetService(
    `
      
      listManufacturers is Operations.ResourceList<Manufacturer>;
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  strictEqual(sdkPackage.models.length, 5);
  strictEqual(sdkPackage.models.filter((x) => !isAzureCoreModel(x)).length, 1);
  const manufacturerModel = sdkPackage.models.find(
    (x) => !isAzureCoreModel(x) && x.name === "Manufacturer",
  );
  ok(manufacturerModel);
  const widgetClient = sdkPackage.clients[0].children?.[0];
  ok(widgetClient);

  strictEqual(widgetClient.clientInitialization.parameters.length, 3);
  const apiVersionClientParam = widgetClient.clientInitialization.parameters.find(
    (x) => x.isApiVersionParam,
  );
  ok(apiVersionClientParam);

  strictEqual(widgetClient.clientInitialization.initializedBy, InitializedByFlags.Default);
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

  const clientRequestIdProperty = pagingModel.properties.find((x) => x.name === "clientRequestId");
  ok(clientRequestIdProperty);
  strictEqual(clientRequestIdProperty.kind, "property");
});

it("getWidgetAnalytics", async () => {
  const { program } = await compileAzureWidgetService(
    `
    
    getWidgetAnalytics is Operations.ResourceRead<WidgetAnalytics>;
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const parentClient = sdkPackage.clients.filter(
    (c) => c.clientInitialization.initializedBy & InitializedByFlags.Individually,
  )[0];
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
