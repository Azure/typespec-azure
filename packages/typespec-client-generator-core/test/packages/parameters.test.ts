import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkHeaderParameter,
  SdkHttpOperation,
  SdkPathParameter,
  SdkQueryParameter,
  SdkServiceMethod,
} from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient, getServiceWithDefaultApiVersion } from "./utils.js";

describe("typespec-client-generator-core: parameters", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("path basic", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@path path: string): void;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.crossLanguageDefintionId, "My.Service.myOp");
    strictEqual(method.parameters.length, 1);

    const methodParam = method.parameters[0];
    strictEqual(methodParam.kind, "method");
    strictEqual(methodParam.name, "path");
    strictEqual(methodParam.optional, false);
    strictEqual(methodParam.onClient, false);
    strictEqual(methodParam.isApiVersionParam, false);
    strictEqual(methodParam.type.kind, "string");

    const serviceOperation = method.operation;
    strictEqual(serviceOperation.bodyParam, undefined);
    strictEqual(
      serviceOperation.exceptions.find((x) => x.statusCodes === "*"),
      undefined,
    );

    strictEqual(serviceOperation.parameters.length, 1);
    const pathParam = serviceOperation.parameters[0];

    strictEqual(pathParam.kind, "path");
    strictEqual(pathParam.serializedName, "path");
    strictEqual(pathParam.name, "path");
    strictEqual(pathParam.optional, false);
    strictEqual(pathParam.onClient, false);
    strictEqual(pathParam.isApiVersionParam, false);
    strictEqual(pathParam.type.kind, "string");
    strictEqual(pathParam.urlEncode, true);
    strictEqual(method.response.kind, "method");
    strictEqual(method.response.type, undefined);

    const correspondingMethodParams = pathParam.correspondingMethodParams;
    strictEqual(correspondingMethodParams.length, 1);
    strictEqual(pathParam.name, correspondingMethodParams[0].name);
  });

  it("path basic with null", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@path path: string | null): void;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    const methodParam = method.parameters[0];
    strictEqual(methodParam.type.kind, "nullable");

    const serviceOperation = method.operation;
    const pathParam = serviceOperation.parameters[0];
    strictEqual(pathParam.type.kind, "nullable");
  });

  it("path defined in model", async () => {
    await runner.compileWithBuiltInService(`
      @route("{name}")
      @put
      op pathInModel(...NameParameter): void;

      model NameParameter {
        @doc("Name parameter")
        @pattern("^[a-zA-Z0-9-]{3,24}$")
        @format("UUID")
        name: string;
      }
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "pathInModel");
    strictEqual(method.kind, "basic");
    strictEqual(method.crossLanguageDefintionId, "TestService.pathInModel");
    strictEqual(method.parameters.length, 1);
    const pathMethod = method.parameters[0];
    strictEqual(pathMethod.kind, "method");
    strictEqual(pathMethod.name, "name");
    strictEqual(pathMethod.optional, false);
    strictEqual(pathMethod.onClient, false);
    strictEqual(pathMethod.isApiVersionParam, false);
    strictEqual(pathMethod.type.kind, "string");

    const serviceOperation = method.operation;
    strictEqual(serviceOperation.bodyParam, undefined);
    strictEqual(serviceOperation.parameters.length, 1);
    const pathParam = serviceOperation.parameters[0];
    strictEqual(pathParam.kind, "path");
    strictEqual(pathParam.serializedName, "name");
    strictEqual(pathParam.name, "name");
    strictEqual(pathParam.optional, false);
    strictEqual(pathParam.onClient, false);
    strictEqual(pathParam.isApiVersionParam, false);
    strictEqual(pathParam.type.kind, "string");
    strictEqual(pathParam.urlEncode, true);
    strictEqual(pathParam.correspondingMethodParams.length, 1);
    deepStrictEqual(pathParam.correspondingMethodParams[0], pathMethod);
  });

  it("header basic", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@header header: string): void;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.crossLanguageDefintionId, "My.Service.myOp");
    strictEqual(method.parameters.length, 1);

    const methodParam = method.parameters[0];
    strictEqual(methodParam.kind, "method");
    strictEqual(methodParam.name, "header");
    strictEqual(methodParam.optional, false);
    strictEqual(methodParam.onClient, false);
    strictEqual(methodParam.isApiVersionParam, false);
    strictEqual(methodParam.type.kind, "string");

    const serviceOperation = method.operation;
    strictEqual(serviceOperation.bodyParam, undefined);
    strictEqual(
      serviceOperation.exceptions.find((x) => x.statusCodes === "*"),
      undefined,
    );

    strictEqual(serviceOperation.parameters.length, 1);
    const headerParam = serviceOperation.parameters[0];

    strictEqual(headerParam.kind, "header");
    strictEqual(headerParam.serializedName, "header");
    strictEqual(headerParam.name, "header");
    strictEqual(headerParam.optional, false);
    strictEqual(headerParam.onClient, false);
    strictEqual(headerParam.isApiVersionParam, false);
    strictEqual(headerParam.type.kind, "string");
    strictEqual(headerParam.collectionFormat, undefined);

    const correspondingMethodParams = headerParam.correspondingMethodParams;
    strictEqual(correspondingMethodParams.length, 1);
    strictEqual(headerParam.name, correspondingMethodParams[0].name);
  });

  it("header basic with null", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@header header: string | null): void;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    const methodParam = method.parameters[0];
    strictEqual(methodParam.type.kind, "nullable");

    const serviceOperation = method.operation;
    const headerParam = serviceOperation.parameters[0];
    strictEqual(headerParam.type.kind, "nullable");
  });

  it("header collection format", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@header({format: "multi"}) header: string): void;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.kind, "basic");

    strictEqual(method.operation.parameters.length, 1);
    const headerParam = method.operation.parameters[0];
    strictEqual(headerParam.kind, "header");
    strictEqual(headerParam.collectionFormat, "multi");
  });

  it("query basic", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@query query: string): void;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 1);

    const methodParam = method.parameters[0];
    strictEqual(methodParam.kind, "method");
    strictEqual(methodParam.name, "query");
    strictEqual(methodParam.optional, false);
    strictEqual(methodParam.onClient, false);
    strictEqual(methodParam.isApiVersionParam, false);
    strictEqual(methodParam.type.kind, "string");

    const serviceOperation = method.operation;
    strictEqual(serviceOperation.bodyParam, undefined);
    strictEqual(
      serviceOperation.exceptions.find((x) => x.statusCodes === "*"),
      undefined,
    );

    strictEqual(serviceOperation.parameters.length, 1);
    const queryParam = serviceOperation.parameters[0];
    strictEqual(queryParam.kind, "query");
    strictEqual(queryParam.serializedName, "query");
    strictEqual(queryParam.name, "query");
    strictEqual(queryParam.optional, false);
    strictEqual(queryParam.onClient, false);
    strictEqual(queryParam.isApiVersionParam, false);
    strictEqual(queryParam.type.kind, "string");
    strictEqual(queryParam.collectionFormat, undefined);

    const correspondingMethodParams = queryParam.correspondingMethodParams;
    strictEqual(correspondingMethodParams.length, 1);
    strictEqual(queryParam.name, correspondingMethodParams[0].name);
  });

  it("query basic with null", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;

      op myOp(@query query: string | null): void;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    const methodParam = method.parameters[0];
    strictEqual(methodParam.type.kind, "nullable");

    const serviceOperation = method.operation;
    const queryParam = serviceOperation.parameters[0];
    strictEqual(queryParam.type.kind, "nullable");
  });

  it("query collection format", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;
      
      #suppress "deprecated" "Legacy test"
      op myOp(@query({format: "multi"}) query: string): void;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.kind, "basic");

    strictEqual(method.operation.parameters.length, 1);
    const queryParm = method.operation.parameters[0];
    strictEqual(queryParm.kind, "query");
    strictEqual(queryParm.collectionFormat, "multi");
  });

  it("query collection format for csv", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
      @service({})
      namespace My.Service;
      
      #suppress "deprecated" "Legacy test"
      op myOp(@query({format: "csv"}) query: string): void;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.kind, "basic");

    strictEqual(method.operation.parameters.length, 1);
    const queryParm = method.operation.parameters[0];
    strictEqual(queryParm.kind, "query");
    strictEqual(queryParm.collectionFormat, "csv");
  });

  it("body basic", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model Input {
          key: string;
        }

        op myOp(@body body: Input): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 1);
    strictEqual(sdkPackage.models[0].name, "Input");
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 2);

    const methodBodyParam = method.parameters.find((x) => x.name === "body");
    ok(methodBodyParam);
    strictEqual(methodBodyParam.kind, "method");
    strictEqual(methodBodyParam.optional, false);
    strictEqual(methodBodyParam.onClient, false);
    strictEqual(methodBodyParam.isApiVersionParam, false);
    strictEqual(methodBodyParam.type, sdkPackage.models[0]);

    const methodContentTypeParam = method.parameters.find((x) => x.name === "contentType");
    ok(methodContentTypeParam);
    strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
    strictEqual(methodContentTypeParam.type.kind, "constant");
    strictEqual(methodContentTypeParam.onClient, false);
    strictEqual(methodContentTypeParam.optional, false);

    const serviceOperation = method.operation;
    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);
    strictEqual(bodyParameter.kind, "body");
    deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
    strictEqual(bodyParameter.defaultContentType, "application/json");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, false);
    strictEqual(bodyParameter.type, sdkPackage.models[0]);

    const correspondingMethodParams = bodyParameter.correspondingMethodParams;
    strictEqual(correspondingMethodParams.length, 1);
    strictEqual(bodyParameter.name, correspondingMethodParams[0].name);

    strictEqual(serviceOperation.parameters.length, 1);
    const contentTypeParam = serviceOperation.parameters[0];
    strictEqual(contentTypeParam.name, "contentType");
    strictEqual(contentTypeParam.serializedName, "Content-Type");
    strictEqual(contentTypeParam.clientDefaultValue, undefined);
    strictEqual(contentTypeParam.onClient, false);
    strictEqual(contentTypeParam.optional, false);

    const correspondingContentTypeMethodParams = contentTypeParam.correspondingMethodParams;
    strictEqual(correspondingContentTypeMethodParams.length, 1);
    strictEqual(correspondingContentTypeMethodParams[0], methodContentTypeParam);
  });

  it("body basic with null", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model Input {
          key: string;
        }

        op myOp(@body body: Input | null): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    const methodBodyParam = method.parameters.find((x) => x.name === "body");
    ok(methodBodyParam);
    strictEqual(methodBodyParam.type.kind, "nullable");

    const serviceOperation = method.operation;
    ok(serviceOperation.bodyParam);
    strictEqual(serviceOperation.bodyParam.type.kind, "nullable");
  });

  it("body optional", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model Input {
          key: string;
        }

        op myOp(@body body?: Input): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(sdkPackage.models.length, 1);
    strictEqual(sdkPackage.models[0].name, "Input");
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 2);

    const methodBodyParam = method.parameters.find((x) => x.name === "body");
    ok(methodBodyParam);
    strictEqual(methodBodyParam.kind, "method");
    strictEqual(methodBodyParam.optional, true);
    strictEqual(methodBodyParam.onClient, false);
    strictEqual(methodBodyParam.isApiVersionParam, false);
    strictEqual(methodBodyParam.type, sdkPackage.models[0]);

    const methodContentTypeParam = method.parameters.find((x) => x.name === "contentType");
    ok(methodContentTypeParam);
    strictEqual(methodContentTypeParam.clientDefaultValue, undefined);
    strictEqual(methodContentTypeParam.type.kind, "constant");
    strictEqual(methodContentTypeParam.onClient, false);
    strictEqual(methodContentTypeParam.optional, true);

    const serviceOperation = method.operation;
    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);
    strictEqual(bodyParameter.kind, "body");
    deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
    strictEqual(bodyParameter.defaultContentType, "application/json");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, true);
    strictEqual(bodyParameter.type, sdkPackage.models[0]);

    const correspondingMethodParams = bodyParameter.correspondingMethodParams;
    strictEqual(correspondingMethodParams.length, 1);
    strictEqual(bodyParameter.name, correspondingMethodParams[0].name);

    strictEqual(serviceOperation.parameters.length, 1);
    const contentTypeParam = serviceOperation.parameters[0];
    strictEqual(contentTypeParam.name, "contentType");
    strictEqual(contentTypeParam.serializedName, "Content-Type");
    strictEqual(contentTypeParam.clientDefaultValue, undefined);
    strictEqual(contentTypeParam.onClient, false);
    strictEqual(contentTypeParam.optional, true);

    const correspondingContentTypeMethodParams = contentTypeParam.correspondingMethodParams;
    strictEqual(correspondingContentTypeMethodParams.length, 1);
    strictEqual(correspondingContentTypeMethodParams[0], methodContentTypeParam);
  });

  it("parameter grouping", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model RequestOptions {
          @header header: string;
          @query query: string;
          @body body: string;
        };

        op myOp(options: RequestOptions): void;
        `);

    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);

    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 2);

    let methodParam = method.parameters[0];
    strictEqual(methodParam.kind, "method");
    strictEqual(methodParam.name, "options");
    strictEqual(methodParam.optional, false);
    strictEqual(methodParam.onClient, false);
    strictEqual(methodParam.isApiVersionParam, false);
    strictEqual(methodParam.type.kind, "model");
    strictEqual(methodParam.type.properties.length, 3);

    const model = methodParam.type;
    strictEqual(model.properties[0].kind, "header");
    strictEqual(model.properties[0].name, "header");
    strictEqual(model.properties[0].optional, false);
    strictEqual(model.properties[0].onClient, false);
    strictEqual(model.properties[0].isApiVersionParam, false);
    strictEqual(model.properties[0].type.kind, "string");

    strictEqual(model.properties[1].kind, "query");
    strictEqual(model.properties[1].name, "query");
    strictEqual(model.properties[1].optional, false);
    strictEqual(model.properties[1].onClient, false);
    strictEqual(model.properties[1].isApiVersionParam, false);
    strictEqual(model.properties[1].type.kind, "string");

    strictEqual(model.properties[2].kind, "body");
    strictEqual(model.properties[2].name, "body");
    strictEqual(model.properties[2].optional, false);
    strictEqual(model.properties[2].onClient, false);
    strictEqual(model.properties[2].isApiVersionParam, false);
    strictEqual(model.properties[2].type.kind, "string");

    methodParam = method.parameters[1];
    strictEqual(methodParam.kind, "method");
    strictEqual(methodParam.name, "contentType");
    strictEqual(methodParam.optional, false);
    strictEqual(methodParam.onClient, false);
    strictEqual(methodParam.isApiVersionParam, false);
    strictEqual(methodParam.type.kind, "constant");

    const serviceOperation = method.operation;
    strictEqual(serviceOperation.parameters.length, 3);

    ok(serviceOperation.bodyParam);
    const correspondingBodyParams = serviceOperation.bodyParam.correspondingMethodParams;
    strictEqual(correspondingBodyParams.length, 1);
    strictEqual(correspondingBodyParams[0].name, "body");

    const parameters = serviceOperation.parameters;
    strictEqual(parameters.length, 3);

    const headerParams = parameters.filter((x): x is SdkHeaderParameter => x.kind === "header");
    strictEqual(headerParams.length, 2);
    let correspondingHeaderParams = headerParams[0].correspondingMethodParams;
    strictEqual(correspondingHeaderParams.length, 1);
    strictEqual(correspondingHeaderParams[0].name, "header");

    correspondingHeaderParams = headerParams[1].correspondingMethodParams;
    strictEqual(correspondingHeaderParams.length, 1);
    strictEqual(correspondingHeaderParams[0].name, "contentType");

    const queryParams = parameters.filter((x): x is SdkQueryParameter => x.kind === "query");
    strictEqual(queryParams.length, 1);
    const correspondingQueryParams = queryParams[0].correspondingMethodParams;
    strictEqual(correspondingQueryParams.length, 1);
    strictEqual(correspondingQueryParams[0].name, "query");
  });

  describe("content type", () => {
    it("content type will be added if not defined and there is body", async () => {
      await runner.compileWithBuiltInService(`
        @patch op patchNull(@body body: string): void;
          `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(method.name, "patchNull");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      let methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "body");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      methodParam = method.parameters[1];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "contentType");
      strictEqual(methodParam.optional, false);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "constant");
      strictEqual(methodParam.type.value, "application/json");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 1);

      ok(serviceOperation.bodyParam);
      const correspondingBodyParams = serviceOperation.bodyParam.correspondingMethodParams;
      strictEqual(correspondingBodyParams.length, 1);
      strictEqual(correspondingBodyParams[0].name, "body");

      strictEqual(serviceOperation.parameters.length, 1);
      const correspondingHeaderParams = serviceOperation.parameters[0].correspondingMethodParams;
      strictEqual(correspondingHeaderParams.length, 1);
      strictEqual(correspondingHeaderParams[0].name, "contentType");
    });

    it("ensure content type is a constant if only one possibility", async () => {
      await runner.compileWithBuiltInService(`
        model DefaultDatetimeProperty {
          value: utcDateTime;
        }
        @post op default(@body body: DefaultDatetimeProperty): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);

      strictEqual(method.parameters.length, 2);
      const methodBodyParam = method.parameters[0];
      strictEqual(methodBodyParam.name, "body");
      strictEqual(methodBodyParam.type, sdkPackage.models[0]);

      const methodContentTypeParam = method.parameters[1];
      strictEqual(methodContentTypeParam.name, "contentType");

      const serviceOperation = method.operation;
      const serviceBodyParam = serviceOperation.bodyParam;
      ok(serviceBodyParam);
      strictEqual(serviceBodyParam.kind, "body");
      strictEqual(serviceBodyParam.contentTypes.length, 1);
      strictEqual(serviceBodyParam.defaultContentType, "application/json");
      strictEqual(serviceBodyParam.contentTypes[0], "application/json");
      deepStrictEqual(serviceBodyParam.correspondingMethodParams[0], methodBodyParam);

      strictEqual(serviceOperation.parameters.length, 1);
      const serviceContentTypeParam = serviceOperation.parameters[0];
      strictEqual(serviceContentTypeParam.name, "contentType");
      strictEqual(serviceContentTypeParam.serializedName, "Content-Type");
      strictEqual(serviceContentTypeParam.clientDefaultValue, undefined);
      strictEqual(serviceContentTypeParam.type.kind, "constant");
      strictEqual(serviceContentTypeParam.type.value, "application/json");
      strictEqual(serviceContentTypeParam.type.valueType.kind, "string");
      deepStrictEqual(serviceContentTypeParam.correspondingMethodParams[0], methodContentTypeParam);
    });

    it("content type should be optional if body is optional", async () => {
      await runner.compileWithBuiltInService(`
        @patch op patchNull(@body body?: string): void;
          `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(method.name, "patchNull");
      strictEqual(method.kind, "basic");
      strictEqual(method.parameters.length, 2);

      let methodParam = method.parameters[0];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "body");
      strictEqual(methodParam.optional, true);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "string");

      methodParam = method.parameters[1];
      strictEqual(methodParam.kind, "method");
      strictEqual(methodParam.name, "contentType");
      strictEqual(methodParam.optional, true);
      strictEqual(methodParam.onClient, false);
      strictEqual(methodParam.isApiVersionParam, false);
      strictEqual(methodParam.type.kind, "constant");
      strictEqual(methodParam.type.value, "application/json");

      const serviceOperation = method.operation;
      strictEqual(serviceOperation.parameters.length, 1);
    });
  });

  it("ensure accept is a constant if only one possibility (json)", async () => {
    await runner.compileWithBuiltInService(`
      model DefaultDatetimeProperty {
        value: utcDateTime;
      }
      @get op default(): DefaultDatetimeProperty;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);

    strictEqual(method.parameters.length, 1);
    const methodAcceptParam = method.parameters[0];
    strictEqual(methodAcceptParam.name, "accept");

    const serviceOperation = method.operation;
    strictEqual(serviceOperation.parameters.length, 1);
    const serviceContentTypeParam = serviceOperation.parameters[0];
    strictEqual(serviceContentTypeParam.name, "accept");
    strictEqual(serviceContentTypeParam.serializedName, "Accept");
    strictEqual(serviceContentTypeParam.clientDefaultValue, undefined);
    strictEqual(serviceContentTypeParam.type.kind, "constant");
    strictEqual(serviceContentTypeParam.type.value, "application/json");
    strictEqual(serviceContentTypeParam.type.valueType.kind, "string");

    strictEqual(serviceOperation.responses.length, 1);
    const response = serviceOperation.responses.find((x) => x.statusCodes === 200);
    ok(response);
    strictEqual(response.kind, "http");
    strictEqual(response.type, sdkPackage.models[0]);
    strictEqual(response.contentTypes?.length, 1);
    strictEqual(response.contentTypes[0], "application/json");
    strictEqual(response.defaultContentType, "application/json");

    strictEqual(method.response.kind, "method");
    strictEqual(method.response.type, sdkPackage.models[0]);
  });

  it("ensure accept is a constant if only one possibility (non-json)", async () => {
    await runner.compileWithBuiltInService(`
      @get op default(): {
        @header
        contentType: "image/png";
    
        @body
        value: bytes;
      };
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);

    strictEqual(method.parameters.length, 1);
    const methodAcceptParam = method.parameters[0];
    strictEqual(methodAcceptParam.name, "accept");

    const serviceOperation = method.operation;
    strictEqual(serviceOperation.parameters.length, 1);
    const serviceContentTypeParam = serviceOperation.parameters[0];
    strictEqual(serviceContentTypeParam.name, "accept");
    strictEqual(serviceContentTypeParam.serializedName, "Accept");
    strictEqual(serviceContentTypeParam.clientDefaultValue, undefined);
    strictEqual(serviceContentTypeParam.type.kind, "constant");
    strictEqual(serviceContentTypeParam.type.value, "image/png");
    strictEqual(serviceContentTypeParam.type.valueType.kind, "string");

    strictEqual(serviceOperation.responses.length, 1);
    const response = serviceOperation.responses.find((x) => x.statusCodes === 200);
    ok(response);
    strictEqual(response.kind, "http");
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(response.contentTypes?.length, 1);
    strictEqual(response.contentTypes[0], "image/png");
    strictEqual(response.defaultContentType, "image/png");

    strictEqual(method.response.kind, "method");
    strictEqual(method.response.type?.kind, "bytes");
  });

  it("lro rpc case", async () => {
    const runnerWithCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core", "Azure.Core.Traits"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithCore.compile(
      getServiceWithDefaultApiVersion(`
        model GenerationOptions {
          prompt: string;
        }
        
        model GenerationResponse is Azure.Core.Foundations.OperationStatus<GenerationResult>;
        
        model GenerationResult {
          data: string;
        }
        
        @route("/generations:submit")
        op longRunningRpc is Azure.Core.LongRunningRpcOperation<GenerationOptions, GenerationResponse, GenerationResult>;
      `),
    );
    const sdkPackage = runnerWithCore.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);

    strictEqual(method.parameters.length, 3);
    deepStrictEqual(method.parameters.map((x) => x.name).sort(), [
      "accept",
      "contentType",
      "prompt",
    ]);
    strictEqual(method.operation.parameters.length, 3);
    deepStrictEqual(method.operation.parameters.map((x) => x.name).sort(), [
      "accept",
      "apiVersion",
      "contentType",
    ]);
    strictEqual(method.operation.bodyParam?.type.kind, "model");
    strictEqual(method.operation.bodyParam.type.properties.length, 1);
    strictEqual(method.operation.bodyParam.type.properties[0].name, "prompt");
  });

  it("never void parameter or response", async () => {
    await runner.compileWithBuiltInService(`
        op TestTemplate<
          headerType,
          queryType,
          bodyType,
          responseHeaderType,
          responseBodyType
        >(@header h: headerType, @query q: queryType, @body b: bodyType): {
          @header h: responseHeaderType;
          @body b: responseBodyType;
        };
        op test is TestTemplate<void, void, void, void, void>;
      `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.parameters.length, 0);
    strictEqual(method.response.type, undefined);
    strictEqual(method.operation.parameters.length, 0);
    const response = method.operation.responses.find((x) => x.statusCodes === 200);
    ok(response);
    strictEqual(response.headers.length, 0);
    strictEqual(response.type, undefined);
  });

  describe("uri template related", () => {
    it("path param: template only", async () => {
      await runner.compileWithBuiltInService(`
        @route("template-only/{param}")
        op templateOnly(param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.path, "/template-only/{param}");
      strictEqual(method.operation.uriTemplate, "/template-only/{param}");
      const param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "simple");
      strictEqual(param.explode, false);
    });

    it("path param: explicit", async () => {
      await runner.compileWithBuiltInService(`
        @route("explicit/{param}")
        op explicit(@path param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.path, "/explicit/{param}");
      strictEqual(method.operation.uriTemplate, "/explicit/{param}");
      const param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "simple");
      strictEqual(param.explode, false);
    });

    it("path param: annotation only", async () => {
      await runner.compileWithBuiltInService(`
        @route("annotation-only")
        op annotationOnly(@path param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.path, "/annotation-only/{param}");
      strictEqual(method.operation.uriTemplate, "/annotation-only/{param}");
      const param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "simple");
      strictEqual(param.explode, false);
    });

    it("path param: template only with allowReserved", async () => {
      await runner.compileWithBuiltInService(`
        @route("template/{+param}")
        op template(param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.path, "/template/{param}");
      strictEqual(method.operation.uriTemplate, "/template/{+param}");
      const param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, true);
      strictEqual(param.style, "simple");
      strictEqual(param.explode, false);
    });

    it("path param: annotation with allowReserved", async () => {
      await runner.compileWithBuiltInService(`
        @route("annotation")
        op annotation(@path(#{ allowReserved: true }) param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.path, "/annotation/{param}");
      strictEqual(method.operation.uriTemplate, "/annotation/{+param}");
      const param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, true);
      strictEqual(param.style, "simple");
      strictEqual(param.explode, false);
    });

    it("path param: explode false with style in template", async () => {
      await runner.compileWithBuiltInService(`
        @route("simple{param}")
        op simple(param: string): void;

        @route("label{.param}")
        op label(param: string): void;

        @route("path{/param}")
        op path(param: string): void;

        @route("matrix{;param}")
        op matrix(param: string): void;

        @route("fragment{#param}")
        op fragment(param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;

      let method = sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/simple{param}");
      strictEqual(method.operation.uriTemplate, "/simple{param}");
      let param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "simple");
      strictEqual(param.explode, false);

      method = sdkPackage.clients[0].methods[1] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/label{param}");
      strictEqual(method.operation.uriTemplate, "/label{.param}");
      param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "label");
      strictEqual(param.explode, false);

      method = sdkPackage.clients[0].methods[2] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/path{param}");
      strictEqual(method.operation.uriTemplate, "/path{/param}");
      param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "path");
      strictEqual(param.explode, false);

      method = sdkPackage.clients[0].methods[3] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/matrix{param}");
      strictEqual(method.operation.uriTemplate, "/matrix{;param}");
      param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "matrix");
      strictEqual(param.explode, false);

      method = sdkPackage.clients[0].methods[4] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/fragment{param}");
      strictEqual(method.operation.uriTemplate, "/fragment{#param}");
      param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "fragment");
      strictEqual(param.explode, false);
    });

    it("path param: explode true with style in template", async () => {
      await runner.compileWithBuiltInService(`
        @route("simple{param*}")
        op simple(param: string): void;

        @route("label{.param*}")
        op label(param: string): void;

        @route("path{/param*}")
        op path(param: string): void;

        @route("matrix{;param*}")
        op matrix(param: string): void;

        @route("fragment{#param*}")
        op fragment(param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;

      let method = sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/simple{param}");
      strictEqual(method.operation.uriTemplate, "/simple{param*}");
      let param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "simple");
      strictEqual(param.explode, true);

      method = sdkPackage.clients[0].methods[1] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/label{param}");
      strictEqual(method.operation.uriTemplate, "/label{.param*}");
      param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "label");
      strictEqual(param.explode, true);

      method = sdkPackage.clients[0].methods[2] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/path{param}");
      strictEqual(method.operation.uriTemplate, "/path{/param*}");
      param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "path");
      strictEqual(param.explode, true);

      method = sdkPackage.clients[0].methods[3] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/matrix{param}");
      strictEqual(method.operation.uriTemplate, "/matrix{;param*}");
      param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "matrix");
      strictEqual(param.explode, true);

      method = sdkPackage.clients[0].methods[4] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/fragment{param}");
      strictEqual(method.operation.uriTemplate, "/fragment{#param*}");
      param = method.operation.parameters[0] as SdkPathParameter;
      strictEqual(param.allowReserved, false);
      strictEqual(param.style, "fragment");
      strictEqual(param.explode, true);
    });

    it("query param: template only", async () => {
      await runner.compileWithBuiltInService(`
        @route("template-only{?param}")
        op templateOnly(param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.path, "/template-only");
      strictEqual(method.operation.uriTemplate, "/template-only{?param}");
      const param = method.operation.parameters[0] as SdkQueryParameter;
      strictEqual(param.collectionFormat, undefined);
      strictEqual(param.explode, false);
    });

    it("query param: explicit", async () => {
      await runner.compileWithBuiltInService(`
        @route("explicit{?param}")
        op explicit(@query param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.path, "/explicit");
      strictEqual(method.operation.uriTemplate, "/explicit{?param}");
      const param = method.operation.parameters[0] as SdkQueryParameter;
      strictEqual(param.collectionFormat, undefined);
      strictEqual(param.explode, false);
    });

    it("query param: annotation only", async () => {
      await runner.compileWithBuiltInService(`
        @route("annotation-only")
        op annotationOnly(@query param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.operation.path, "/annotation-only");
      strictEqual(method.operation.uriTemplate, "/annotation-only{?param}");
      const param = method.operation.parameters[0] as SdkQueryParameter;
      strictEqual(param.collectionFormat, undefined);
      strictEqual(param.explode, false);
    });

    it("query param: explode in template", async () => {
      await runner.compileWithBuiltInService(`
        @route("no_explode{?param}")
        op no_explode(param: string): void;

        @route("explode{?param*}")
        op explode(param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;

      let method = sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/no_explode");
      strictEqual(method.operation.uriTemplate, "/no_explode{?param}");
      let param = method.operation.parameters[0] as SdkQueryParameter;
      strictEqual(param.collectionFormat, undefined);
      strictEqual(param.explode, false);

      method = sdkPackage.clients[0].methods[1] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.path, "/explode");
      strictEqual(method.operation.uriTemplate, "/explode{?param*}");
      param = method.operation.parameters[0] as SdkQueryParameter;
      strictEqual(param.collectionFormat, undefined);
      strictEqual(param.explode, true);
    });

    it("body param: serialized name with encoded name", async () => {
      await runner.compileWithBuiltInService(`
        op explode(@body @encodedName("application/json", "test") param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;

      const method = sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.bodyParam?.serializedName, "test");
    });

    it("body param: serialized name without encoded name", async () => {
      await runner.compileWithBuiltInService(`
        op explode(@body param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;

      const method = sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.bodyParam?.serializedName, "param");
    });

    it("body param: serialized name of implicit body", async () => {
      await runner.compileWithBuiltInService(`
        op explode(param: string): void;
      `);
      const sdkPackage = runner.context.sdkPackage;

      const method = sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>;
      strictEqual(method.operation.bodyParam?.serializedName, "body");
    });
  });

  describe("method parameter not used in operation", () => {
    it("autoroute with constant", async () => {
      await runner.compileWithBuiltInService(`
          @autoRoute
          op test(@path param: "test"): void;
        `);
      const sdkPackage = runner.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      strictEqual(method.parameters.length, 0);
      strictEqual(method.operation.parameters.length, 0);
      strictEqual(method.operation.uriTemplate, "/test");
    });

    it("singleton resource", async () => {
      const runnerWithArm = await createSdkTestRunner({
        librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
        autoUsings: ["Azure.ResourceManager", "Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithArm.compileWithBuiltInAzureResourceManagerService(`
        @singleton("default")
        model SingletonTrackedResource is TrackedResource<SingletonTrackedResourceProperties> {
          ...ResourceNameParameter<SingletonTrackedResource>;
        }

        model SingletonTrackedResourceProperties {
          description?: string;
        }

        @armResourceOperations
        interface Singleton {
          createOrUpdate is ArmResourceCreateOrReplaceAsync<SingletonTrackedResource>;
        }
      `);

      const sdkPackage = runnerWithArm.context.sdkPackage;
      const method = getServiceMethodOfClient(sdkPackage);
      deepStrictEqual(
        method.parameters.map((p) => p.name),
        ["resourceGroupName", "resource", "contentType", "accept"],
      );
      deepStrictEqual(
        method.operation.parameters.map((p) => p.name),
        ["apiVersion", "subscriptionId", "resourceGroupName", "contentType", "accept"],
      );
    });
  });
});
