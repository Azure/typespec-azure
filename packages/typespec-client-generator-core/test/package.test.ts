import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkClientType,
  SdkHeaderParameter,
  SdkHttpOperation,
  SdkPackage,
  SdkServiceMethod,
} from "../src/interfaces.js";
import { isAzureCoreModel } from "../src/public-utils.js";
import { SdkTestRunner, createSdkTestRunner } from "./test-host.js";

describe("typespec-client-generator-core: package", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe("package name", () => {
    it("as config option", async () => {
      const runnerWithPackageName = await createSdkTestRunner({
        "package-name": "My.Package.Name",
      });
      await runnerWithPackageName.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace Not.My.Package.Name;
      `);

      strictEqual(runnerWithPackageName.context.sdkPackage.name, "My.Package.Name");
    });
    it("from namespace", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace My.Package.Name;
      `);

      strictEqual(runner.context.sdkPackage.name, "My.Package.Name");
    });
  });

  describe("root namespace", () => {
    it("basic namespace", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace My.Namespace;
      `);

      strictEqual(runner.context.sdkPackage.rootNamespace, "My.Namespace");
    });

    it("nested namespaces", async () => {
      await runner.compile(`
        @client({name: "MyClient"})
        @service({})
        namespace My.Namespace {};

        @client({name: "MySecondClient"})
        @service({})
        namespace My.Namespace.Sub {};
      `);

      strictEqual(runner.context.sdkPackage.rootNamespace, "My.Namespace");
    });
  });

  describe("Responses", () => {
    it("basic returning void", async () => {
      await runner.compileWithBuiltInService(
        `
        @error
        model Error {
          code: int32;
          message: string;
        }
        @delete op delete(@path id: string): void | Error;
        `,
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(method.name, "delete");
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.length, 1);

      const voidResponse = serviceResponses.find((x) => x.statusCodes === 204);
      ok(voidResponse);
      strictEqual(voidResponse.kind, "http");
      strictEqual(voidResponse.type, undefined);
      strictEqual(voidResponse.headers.length, 0);

      const errorResponse = method.operation.exceptions.find((x) => x.statusCodes === "*");
      ok(errorResponse);
      strictEqual(errorResponse.kind, "http");
      ok(errorResponse.type);
      strictEqual(errorResponse.type.kind, "model");
      strictEqual(errorResponse.type, sdkPackage.models[0]);

      strictEqual(method.response.type, undefined);
      strictEqual(method.response.resultPath, undefined);
    });
    it("basic returning void and error model has status code", async () => {
      await runner.compileWithBuiltInService(
        `
        @error
        model Error {
          @statusCode _: 403;
          code: int32;
          message: string;
        }
        @delete op delete(@path id: string): void | Error;
        `,
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(method.name, "delete");
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.length, 1);

      const voidResponse = serviceResponses.find((x) => x.statusCodes === 204);
      ok(voidResponse);
      strictEqual(voidResponse.kind, "http");
      strictEqual(voidResponse.type, undefined);
      strictEqual(voidResponse.headers.length, 0);

      const errorResponse = method.operation.exceptions.find((x) => x.statusCodes === 403);
      ok(errorResponse);
      strictEqual(errorResponse.kind, "http");
      ok(errorResponse.type);
      strictEqual(errorResponse.type.kind, "model");
      strictEqual(errorResponse.type, sdkPackage.models[0]);

      strictEqual(method.response.type, undefined);
      strictEqual(method.response.resultPath, undefined);
    });
    it("basic returning model", async () => {
      await runner.compileWithBuiltInService(
        `
      model Widget {
        @visibility("read", "update")
        @path
        id: string;

        weight: int32;
        color: "red" | "blue";
      }

      @error
      model Error {
        code: int32;
        message: string;
      }
      @post op create(...Widget): Widget | Error;
      `,
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 3);
      strictEqual(method.name, "create");
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.length, 1);

      const createResponse = serviceResponses.find((x) => x.statusCodes === 200);
      ok(createResponse);
      strictEqual(createResponse.kind, "http");
      strictEqual(
        createResponse.type,
        sdkPackage.models.find((x) => x.name === "Widget"),
      );
      strictEqual(createResponse.headers.length, 0);

      const errorResponse = method.operation.exceptions.find((x) => x.statusCodes === "*");
      ok(errorResponse);
      strictEqual(errorResponse.kind, "http");
      ok(errorResponse.type);
      strictEqual(errorResponse.type.kind, "model");
      strictEqual(
        errorResponse.type,
        sdkPackage.models.find((x) => x.name === "Error"),
      );

      strictEqual(method.response.kind, "method");
      const methodResponseType = method.response.type;
      strictEqual(methodResponseType, createResponse.type);
      strictEqual(method.response.resultPath, undefined);
    });

    it("Headers and body", async () => {
      await runner.compileWithBuiltInService(
        `
        model Widget {
          @header id: string;
          weight: int32;
        }
  
        op operation(): Widget;
        `,
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(method.name, "operation");
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.length, 1);

      strictEqual(method.parameters.length, 1);

      const createResponse = serviceResponses.find((x) => x.statusCodes === 200);
      ok(createResponse);
      strictEqual(createResponse.kind, "http");
      strictEqual(
        createResponse.type,
        sdkPackage.models.find((x) => x.name === "Widget"),
      );
      strictEqual(createResponse.headers.length, 1);
      strictEqual(createResponse.headers[0].serializedName, "id");

      strictEqual(method.response.kind, "method");
      strictEqual(method.response.resultPath, undefined);
      const methodResponseType = method.response.type;
      ok(methodResponseType);
      strictEqual(
        methodResponseType,
        sdkPackage.models.find((x) => x.name === "Widget"),
      );
      strictEqual(methodResponseType.properties.length, 2);
      strictEqual(methodResponseType.properties.filter((x) => x.kind === "header").length, 1);
    });

    it("Headers and body with null", async () => {
      await runner.compileWithBuiltInService(
        `
      model Widget {
        weight: int32;
      }

      op operation(): {@header id: string | null, @body body: Widget | null};
      `,
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      const serviceResponses = method.operation.responses;

      const createResponse = serviceResponses.find((x) => x.statusCodes === 200);
      ok(createResponse);
      strictEqual(createResponse.headers[0].type.kind, "nullable");
      strictEqual(createResponse.type?.kind, "nullable");
      strictEqual(method.response.type?.kind, "nullable");
    });

    it("OkResponse with NoContentResponse", async () => {
      await runner.compileWithBuiltInService(
        `
      model Widget {
        weight: int32;
      }

      op operation(): Widget | NoContentResponse;
      `,
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      const serviceResponses = method.operation.responses;

      const okResponse = serviceResponses.find((x) => x.statusCodes === 200);
      ok(okResponse);

      const noContentResponse = serviceResponses.find((x) => x.statusCodes === 204);
      ok(noContentResponse);
      strictEqual(noContentResponse.type, undefined);
      strictEqual(method.response.type?.kind, "nullable");
      strictEqual(
        method.response.type?.type,
        sdkPackage.models.find((x) => x.name === "Widget"),
      );
    });

    it("NoContentResponse", async () => {
      await runner.compileWithBuiltInService(
        `
        @delete op delete(@path id: string): NoContentResponse;
        `,
      );
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(method.name, "delete");
      strictEqual(method.response.type, undefined);
      const serviceResponses = method.operation.responses;
      strictEqual(serviceResponses.length, 1);

      const voidResponse = serviceResponses.find((x) => x.statusCodes === 204);
      ok(voidResponse);
      strictEqual(voidResponse.kind, "http");
      strictEqual(voidResponse.type, undefined);
      strictEqual(voidResponse.headers.length, 0);
      strictEqual(voidResponse.contentTypes, undefined);

      strictEqual(method.response.type, undefined);
      strictEqual(method.response.resultPath, undefined);
    });
  });
  describe("Vanilla Widget Service", () => {
    async function compileVanillaWidgetService(runner: SdkTestRunner, code: string) {
      return await runner.compile(`
      @service({
        title: "Widget Service",
      })
      @versioned(Versions)
      namespace DemoService;

      /** The Contoso Widget Manager service version. */
      enum Versions {
        "2022-08-30",
      }

      model Widget {
        @visibility("read", "update")
        @path
        id: string;

        weight: int32;
        color: "red" | "blue";
      }

      @error
      model Error {
        code: int32;
        message: string;
      }

      @route("/widgets")
      @tag("Widgets")
      interface Widgets {
        ${code}
      }`);
    }

    it("vanilla widget create", async () => {
      await compileVanillaWidgetService(runner, "@post create(...Widget): Widget | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "create");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 4);
      deepStrictEqual(
        method.parameters.map((x) => x.name),
        ["weight", "color", "contentType", "accept"],
      );

      const bodyParameter = method.operation.bodyParam;
      ok(bodyParameter);
      strictEqual(bodyParameter.kind, "body");
      strictEqual(bodyParameter.name, "createRequest");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);
      strictEqual(bodyParameter.type.kind, "model");
      strictEqual(bodyParameter.type.name, "CreateRequest");
      strictEqual(bodyParameter.type.properties.length, 2);
      strictEqual(bodyParameter.correspondingMethodParams.length, 2);

      strictEqual(method.operation.parameters.length, 2);

      const headerParams = method.operation.parameters.filter(
        (x): x is SdkHeaderParameter => x.kind === "header",
      );
      strictEqual(headerParams.length, 2);
      const contentTypeOperationParam = headerParams.find(
        (x) => x.serializedName === "Content-Type",
      );
      ok(contentTypeOperationParam);
      strictEqual(contentTypeOperationParam.clientDefaultValue, undefined);
      strictEqual(contentTypeOperationParam.onClient, false);
      strictEqual(contentTypeOperationParam.optional, false);

      const contentTypeMethodParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeMethodParam);
      strictEqual(contentTypeMethodParam.clientDefaultValue, undefined);
      strictEqual(contentTypeMethodParam.onClient, false);
      strictEqual(contentTypeMethodParam.optional, false);

      strictEqual(contentTypeOperationParam.correspondingMethodParams[0], contentTypeMethodParam);

      const acceptOperationParam = headerParams.find((x) => x.serializedName === "Accept");
      ok(acceptOperationParam);
      strictEqual(acceptOperationParam.clientDefaultValue, undefined);
      strictEqual(acceptOperationParam.clientDefaultValue, undefined);
      strictEqual(acceptOperationParam.onClient, false);
      strictEqual(acceptOperationParam.optional, false);

      const acceptMethodParam = method.parameters.find((x) => x.name === "accept");
      ok(acceptMethodParam);
      strictEqual(acceptMethodParam.clientDefaultValue, undefined);
      strictEqual(acceptMethodParam.onClient, false);
      strictEqual(acceptMethodParam.optional, false);

      strictEqual(acceptOperationParam.correspondingMethodParams[0], acceptMethodParam);
    });
    it("vanilla widget read", async () => {
      await compileVanillaWidgetService(runner, "@get read(@path id: string): Widget | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "read");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodIdParam = method.parameters.find((x) => x.name === "id");
      ok(methodIdParam);
      strictEqual(methodIdParam.kind, "method");
      strictEqual(methodIdParam.optional, false);
      strictEqual(methodIdParam.onClient, false);
      strictEqual(methodIdParam.isApiVersionParam, false);
      strictEqual(methodIdParam.type.kind, "string");

      const methodAcceptParam = method.parameters.find((x) => x.name === "accept");
      ok(methodAcceptParam);
      strictEqual(methodAcceptParam.clientDefaultValue, undefined);

      const serviceOperation = method.operation;

      strictEqual(serviceOperation.parameters.length, 2);
      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "id");
      strictEqual(pathParam.name, "id");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");

      const operationAcceptParam = serviceOperation.parameters.find(
        (x) => x.kind === "header" && x.serializedName === "Accept",
      );
      ok(operationAcceptParam);
      strictEqual(operationAcceptParam.clientDefaultValue, undefined);

      strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);

      const correspondingMethodParams = pathParam.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(pathParam.name, correspondingMethodParams[0].name);
    });
    it("vanilla widget update", async () => {
      await compileVanillaWidgetService(runner, "@patch update(...Widget): Widget | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "update");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 5);

      let methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "id");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      methodParam = method.parameters[1];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "weight");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "int32");

      methodParam = method.parameters[2];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "color");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "enum");

      const methodContentTypeParam = method.parameters.find((x) => x.name === "contentType");
      ok(methodContentTypeParam);
      strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
      strictEqual(methodContentTypeParam.optional, false);

      const methodAcceptParam = method.parameters.find((x) => x.name === "accept");
      ok(methodAcceptParam);
      strictEqual(methodAcceptParam.clientDefaultValue, undefined);
      strictEqual(methodAcceptParam.optional, false);

      const serviceOperation = method.operation;

      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "id");
      strictEqual(pathParam.name, "id");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");

      const bodyParameter = serviceOperation.bodyParam;
      ok(bodyParameter);

      strictEqual(bodyParameter.kind, "body");
      deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
      strictEqual(bodyParameter.defaultContentType, "application/json");
      strictEqual(bodyParameter.onClient, false);
      strictEqual(bodyParameter.optional, false);

      strictEqual(bodyParameter.type.kind, "model");
      strictEqual(
        bodyParameter.type,
        sdkPackage.models.filter((m) => m.name === "UpdateRequest")[0],
      );

      const headerParams = serviceOperation.parameters.filter(
        (x): x is SdkHeaderParameter => x.kind === "header",
      );
      const operationContentTypeParam = headerParams.find(
        (x) => x.serializedName === "Content-Type",
      );
      ok(operationContentTypeParam);
      strictEqual(operationContentTypeParam.clientDefaultValue, undefined);
      strictEqual(operationContentTypeParam.optional, false);

      const operationAcceptParam = headerParams.find((x) => x.serializedName === "Accept");
      ok(operationAcceptParam);
      strictEqual(operationAcceptParam.clientDefaultValue, undefined);
      strictEqual(operationAcceptParam.optional, false);

      const correspondingMethodParams = bodyParameter.correspondingMethodParams.map((x) => x.name);
      deepStrictEqual(correspondingMethodParams, ["weight", "color"]);

      strictEqual(operationContentTypeParam.correspondingMethodParams[0], methodContentTypeParam);
      strictEqual(operationAcceptParam.correspondingMethodParams[0], methodAcceptParam);
    });
    it("vanilla widget delete", async () => {
      await compileVanillaWidgetService(runner, "@delete delete(@path id: string): void | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "delete");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      const methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "id");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      const serviceOperation = method.operation;

      const pathParam = serviceOperation.parameters.find((x) => x.kind === "path");
      ok(pathParam);
      strictEqual(pathParam.kind, "path");
      strictEqual(pathParam.serializedName, "id");
      strictEqual(pathParam.name, "id");
      strictEqual(pathParam.optional, false);
      strictEqual(pathParam.onClient, false);
      strictEqual(pathParam.isApiVersionParam, false);
      strictEqual(pathParam.type.kind, "string");

      const correspondingMethodParams = pathParam.correspondingMethodParams;
      strictEqual(correspondingMethodParams.length, 1);
      strictEqual(pathParam.name, correspondingMethodParams[0].name);
    });
    it("vanilla widget list", async () => {
      await compileVanillaWidgetService(runner, "@get list(): Widget[] | Error;");

      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.name, "list");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 1);
      strictEqual(method.operation.bodyParam, undefined);
    });
  });
  describe("Azure Widget Service", () => {
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
    @service({
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
      @visibility("read")
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
      @visibility("read")
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
      @visibility("read")
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
      @visibility("read")
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

    it("azure widget getWidget", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await compileAzureWidgetService(
        runnerWithCore,
        `
      @doc("Get a Widget")
      getWidget is Operations.ResourceRead<Widget>;
      `,
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      const parentClient = sdkPackage.clients.filter(
        (c) => c.initialization.access === "public",
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
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
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
        getStatus.crossLanguageDefintionId,
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
        createOrUpdate.crossLanguageDefintionId,
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
    });
    it("lro delete", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
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
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
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
        listManufacturers.crossLanguageDefintionId,
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
      strictEqual(
        nextLinkProperty.type.crossLanguageDefinitionId,
        "TypeSpec.Rest.ResourceLocation",
      );
      strictEqual(nextLinkProperty.type.baseType?.kind, "url");
      strictEqual(nextLinkProperty.serializedName, "nextLink");
      strictEqual(nextLinkProperty.serializedName, listManufacturers.nextLinkPath);

      const clientRequestIdProperty = pagingModel.properties.find(
        (x) => x.name === "clientRequestId",
      );
      ok(clientRequestIdProperty);
      strictEqual(clientRequestIdProperty.kind, "header");
    });

    it("azure widget getWidgetAnalytics", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await compileAzureWidgetService(
        runnerWithCore,
        `
      @doc("Get a WidgetAnalytics")
      getWidgetAnalytics is Operations.ResourceRead<WidgetAnalytics>;
      `,
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      const parentClient = sdkPackage.clients.filter(
        (c) => c.initialization.access === "public",
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

      const operationAnalyticsId = method.operation.parameters.find(
        (x) => x.name === "analyticsId",
      );
      ok(operationAnalyticsId);
      strictEqual(operationAnalyticsId.kind, "path");
      strictEqual(operationAnalyticsId.name, "analyticsId");
      strictEqual(operationAnalyticsId.serializedName, "analyticsId");
      strictEqual(operationAnalyticsId.onClient, false);
      strictEqual(operationAnalyticsId.correspondingMethodParams.length, 1);
      strictEqual(operationAnalyticsId.correspondingMethodParams[0], methodAnalyticsId);
    });
  });

  describe("versioning", () => {
    it("define own api version param", async () => {
      await runner.compileWithBuiltInService(`
      model ApiVersionParam {
        @header apiVersion: Versions;
      }

      enum Versions {
        v1, v2
      }

      op getPet(...ApiVersionParam): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.parameters.length, 1);
      const apiVersionParam = method.operation.parameters[0];
      strictEqual(apiVersionParam.kind, "header");
      strictEqual(apiVersionParam.serializedName, "api-version");
      strictEqual(apiVersionParam.name, "apiVersion");
      strictEqual(apiVersionParam.onClient, false);
      strictEqual(apiVersionParam.isApiVersionParam, true);
    });

    it("default api version for interface extends", async () => {
      await runner.compile(`
        namespace Azure.ResourceManager {
          interface Operations {
            @get
            list(@query "api-version": string): void;
          }
        }
        
        @service({})
        @versioned(Versions)
        namespace Test {
          enum Versions {
            v1,
            v2,
          }
        
          interface Operations extends Azure.ResourceManager.Operations {}
        }      
      `);

      const sdkPackage = runner.context.sdkPackage;
      const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      const apiVersionClientParam = client.initialization.properties.find(
        (x) => x.isApiVersionParam,
      );
      ok(apiVersionClientParam);
      strictEqual(apiVersionClientParam.clientDefaultValue, "v2");

      const method = client.methods[0];
      strictEqual(method.parameters.length, 0);
      strictEqual(method.kind, "basic");

      const apiVersionOpParam = method.operation.parameters.find((x) => x.isApiVersionParam);
      ok(apiVersionOpParam);
      strictEqual(apiVersionOpParam.clientDefaultValue, "v2");
      strictEqual(apiVersionOpParam.correspondingMethodParams[0], apiVersionClientParam);
    });

    it("client level signatures by default", async () => {
      const runnerWithArm = await createSdkTestRunner({
        librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
        autoUsings: ["Azure.ResourceManager", "Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithArm.compileWithBuiltInAzureResourceManagerService(`
        model MyProperties {
          @visibility("read")
          @doc("Display name of the Azure Extended Zone.")
          displayName: string;
        }

        @subscriptionResource
        model MyModel is ProxyResource<MyProperties> {
          @key("extendedZoneName")
          @segment("extendedZones")
          @path
          name: string;
        }

        namespace MyClient {
          interface Operations extends Azure.ResourceManager.Operations {}

          @armResourceOperations
          interface MyInterface {
            get is ArmResourceRead<MyModel>;
          }
        }
      `);

      const sdkPackage = runnerWithArm.context.sdkPackage;
      const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      for (const p of client.initialization.properties) {
        ok(p.onClient);
      }
      deepStrictEqual(client.initialization.properties.map((x) => x.name).sort(), [
        "apiVersion",
        "credential",
        "endpoint",
        "subscriptionId",
      ]);
    });

    it("default api version for operation is", async () => {
      await runner.compile(`
        namespace Azure.ResourceManager {
          interface Operations {
            @get
            list(@query "api-version": string): void;
          }
        }
        
        @service({})
        @versioned(Versions)
        namespace Test {
          enum Versions {
            v1,
            v2,
          }
        
          op list is Azure.ResourceManager.Operations.list;
        }      
      `);

      const sdkPackage = runner.context.sdkPackage;
      const client = sdkPackage.clients[0];
      const method = client.methods[0];
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 0); // api-version will be on the client
      strictEqual(method.operation.parameters.length, 1);
      const apiVersionParam = method.operation.parameters[0];
      strictEqual(apiVersionParam.isApiVersionParam, true);
      strictEqual(apiVersionParam.clientDefaultValue, "v2");
      strictEqual(apiVersionParam.correspondingMethodParams.length, 1);
      const clientApiVersionParam = client.initialization.properties.find(
        (x) => x.isApiVersionParam,
      );
      ok(clientApiVersionParam);
      strictEqual(apiVersionParam.correspondingMethodParams[0], clientApiVersionParam);
      strictEqual(clientApiVersionParam.clientDefaultValue, "v2");
    });
    it("add method", async () => {
      await runner.compileWithVersionedService(`
      @route("/v1")
      @post
      @added(Versions.v2)
      op v2(@header headerV2: string): void;
      `);

      const sdkPackage = runner.context.sdkPackage;
      deepStrictEqual(sdkPackage.clients[0].apiVersions, ["v1", "v2"]);
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.kind, "basic");
      deepStrictEqual(method.apiVersions, ["v2"]);
      strictEqual(method.parameters.length, 1);
      const methodParam = sdkPackage.clients[0].methods[0].parameters[0];
      strictEqual(methodParam.name, "headerV2");
      strictEqual(methodParam.kind, "method");
      deepStrictEqual(methodParam.apiVersions, ["v2"]);

      strictEqual(method.operation.parameters.length, 1);
      const headerParam = method.operation.parameters[0];
      strictEqual(headerParam.name, "headerV2");
      strictEqual(headerParam.kind, "header");
      deepStrictEqual(headerParam.apiVersions, ["v2"]);
    });
    it("add parameter", async () => {
      await runner.compileWithVersionedService(`
      @route("/v1")
      @post
      op v1(@added(Versions.v2) @header headerV2: string): void;
      `);

      const sdkPackage = runner.context.sdkPackage;
      deepStrictEqual(sdkPackage.clients[0].apiVersions, ["v1", "v2"]);
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.kind, "basic");
      deepStrictEqual(method.apiVersions, ["v1", "v2"]);
      strictEqual(method.parameters.length, 1);
      const methodParam = sdkPackage.clients[0].methods[0].parameters[0];
      strictEqual(methodParam.name, "headerV2");
      strictEqual(methodParam.kind, "method");
      deepStrictEqual(methodParam.apiVersions, ["v2"]);

      strictEqual(method.operation.parameters.length, 1);
      const headerParam = method.operation.parameters[0];
      strictEqual(headerParam.name, "headerV2");
      strictEqual(headerParam.kind, "header");
      deepStrictEqual(headerParam.apiVersions, ["v2"]);
    });
  });

  describe("lro", () => {
    it("customized lro delete", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compile(`
        @versioned(MyVersions)
        @server("http://localhost:3000", "endpoint")
        @service({name: "Service"})
        namespace My.Service;

        enum MyVersions {
          @useDependency(Versions.v1_0_Preview_2)
          v1: "v1",
        }

        op delete(): {
          ...AcceptedResponse,
          @header("Location")
          @Azure.Core.pollingLocation(Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>)
          @Azure.Core.finalLocation(void)
          location?: string;
        };

        @Azure.Core.lroStatus
        union ResourceProvisioningState {
          Succeeded: "Succeeded",
          Failed: "Failed",
          Canceled: "Canceled",
          string,
        }

        model ArmOperationStatus {
          @Azure.Core.lroStatus
          status: ResourceProvisioningState;
          @key
          @path
          @segment("operationStatuses")
          id: Azure.Core.uuid;
          @visibility("read")
          name?: string;
        }
      `);
      const sdkPackage = runnerWithCore.context.sdkPackage;
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(sdkPackage.enums.length, 1);
    });
  });
});

function getServiceMethodOfClient(
  sdkPackage: SdkPackage<SdkHttpOperation>,
  numMethods: number = 1,
  methodIndex: number = 0,
): SdkServiceMethod<SdkHttpOperation> {
  let client = sdkPackage.clients[0];
  if (client.methods.some((x) => x.kind === "clientaccessor")) {
    client = client.methods.find((x) => x.kind === "clientaccessor")
      ?.response as SdkClientType<SdkHttpOperation>;
  }
  strictEqual(client.methods.length, numMethods);
  const method = client.methods[methodIndex];
  strictEqual(["basic", "paging", "lro", "lropaging"].includes(method.kind), true);
  return method as SdkServiceMethod<SdkHttpOperation>;
}
