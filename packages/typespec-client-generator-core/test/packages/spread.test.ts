import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkClientType,
  SdkHttpOperation,
  SdkServiceMethod,
  UsageFlags,
} from "../../src/interfaces.js";
import { isAzureCoreModel } from "../../src/public-utils.js";
import { getAllModels } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "./utils.js";

describe("typespec-client-generator-core: spread", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("plain model with no decorators", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        model Input {
          key: string;
        }

        op myOp(...Input): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 2);

    const methodParam = method.parameters.find((x) => x.name === "key");
    ok(methodParam);
    strictEqual(methodParam.kind, "method");
    strictEqual(methodParam.optional, false);
    strictEqual(methodParam.onClient, false);
    strictEqual(methodParam.isApiVersionParam, false);
    strictEqual(methodParam.type.kind, "string");

    const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
    ok(contentTypeParam);
    strictEqual(contentTypeParam.clientDefaultValue, undefined);
    strictEqual(contentTypeParam.type.kind, "constant");
    strictEqual(contentTypeParam.onClient, false);

    const serviceOperation = method.operation;
    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);

    strictEqual(bodyParameter.kind, "body");
    deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
    strictEqual(bodyParameter.defaultContentType, "application/json");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, false);
    strictEqual(bodyParameter.type, sdkPackage.models[0]);
    strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
    strictEqual(bodyParameter.type.access, "internal");

    const correspondingMethodParams = bodyParameter.correspondingMethodParams;
    strictEqual(correspondingMethodParams.length, 1);
    strictEqual(correspondingMethodParams[0].name, "key");
  });

  it("alias with no decorators", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;

        alias BodyParameter = {
          name: string;
        };

        op myOp(...BodyParameter): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);

    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 2);

    const methodParam = method.parameters.find((x) => x.name === "name");
    ok(methodParam);
    strictEqual(methodParam.kind, "method");
    strictEqual(methodParam.optional, false);
    strictEqual(methodParam.onClient, false);
    strictEqual(methodParam.isApiVersionParam, false);
    strictEqual(methodParam.type.kind, "string");

    const contentTypeMethodParam = method.parameters.find((x) => x.name === "contentType");
    ok(contentTypeMethodParam);
    strictEqual(contentTypeMethodParam.clientDefaultValue, undefined);
    strictEqual(contentTypeMethodParam.type.kind, "constant");

    const serviceOperation = method.operation;
    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);
    strictEqual(bodyParameter.kind, "body");
    deepStrictEqual(bodyParameter.contentTypes, ["application/json"]);
    strictEqual(bodyParameter.defaultContentType, "application/json");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, false);
    strictEqual(bodyParameter.type.kind, "model");
    strictEqual(bodyParameter.type.properties.length, 1);
    strictEqual(bodyParameter.type.properties[0].name, "name");

    const correspondingMethodParams = bodyParameter.correspondingMethodParams;
    strictEqual(correspondingMethodParams.length, 1);
    strictEqual(bodyParameter.type.properties[0].name, correspondingMethodParams[0].name);
  });

  it("rest template spreading of multiple models", async () => {
    await runner.compile(`
      @service({
        title: "Pet Store Service",
      })
      namespace PetStore;
      using TypeSpec.Rest.Resource;

      @error
      model PetStoreError {
        code: int32;
        message: string;
      }

      @resource("pets")
      model Pet {
        @key("petId")
        id: int32;
      }

      @resource("checkups")
      model Checkup {
        @key("checkupId")
        id: int32;

        vetName: string;
        notes: string;
      }

      interface PetCheckups
        extends ExtensionResourceCreateOrUpdate<Checkup, Pet, PetStoreError>,
          ExtensionResourceList<Checkup, Pet, PetStoreError> {}
      `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 4);
    deepStrictEqual(
      sdkPackage.models.map((x) => x.name).sort(),
      ["CheckupCollectionWithNextLink", "Checkup", "PetStoreError", "CheckupUpdate"].sort(),
    );
    const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
      ?.response as SdkClientType<SdkHttpOperation>;
    const createOrUpdate = client.methods[0];
    strictEqual(createOrUpdate.kind, "basic");
    strictEqual(createOrUpdate.name, "createOrUpdate");
    strictEqual(createOrUpdate.parameters.length, 5);
    strictEqual(createOrUpdate.parameters[0].name, "petId");
    strictEqual(createOrUpdate.parameters[1].name, "checkupId");
    strictEqual(createOrUpdate.parameters[2].name, "resource");
    strictEqual(createOrUpdate.parameters[2].type.kind, "model");
    strictEqual(createOrUpdate.parameters[2].type.name, "CheckupUpdate");
    strictEqual(createOrUpdate.parameters[3].name, "contentType");
    strictEqual(createOrUpdate.parameters[4].name, "accept");

    const opParams = createOrUpdate.operation.parameters;
    strictEqual(opParams.length, 4);
    ok(opParams.find((x) => x.kind === "path" && x.serializedName === "petId"));
    ok(opParams.find((x) => x.kind === "path" && x.serializedName === "checkupId"));
    ok(opParams.find((x) => x.kind === "header" && x.serializedName === "Content-Type"));
    ok(opParams.find((x) => x.kind === "header" && x.serializedName === "Accept"));
    strictEqual(createOrUpdate.operation.responses.length, 2);
    const response200 = createOrUpdate.operation.responses.find((x) => x.statusCodes === 200);
    ok(response200);
    ok(response200.type);
    strictEqual(response200.type.kind, "model");
    strictEqual(response200.type.name, "Checkup");
    const response201 = createOrUpdate.operation.responses.find((x) => x.statusCodes === 201);
    ok(response201);
    ok(response201.type);
    deepStrictEqual(response200.type, response201?.type);
  });

  it("multi layer template with discriminated model spread", async () => {
    const runnerWithCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core", "Azure.Core.Traits"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithCore.compile(`
        @versioned(MyVersions)
        @server("http://localhost:3000", "endpoint")
        @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
        @service({name: "Service"})
        namespace My.Service;
        
        alias ServiceTraits = NoRepeatableRequests &
          NoConditionalRequests &
          NoClientRequestId;

        alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

        @doc("The version of the API.")
        enum MyVersions {
          @doc("The version 2022-12-01-preview.")
          @useDependency(Versions.v1_0_Preview_2)
          v2022_12_01_preview: "2022-12-01-preview",
        }

        @discriminator("kind")
        @resource("dataConnections")
        model DataConnection {
          id?: string;

          @key("dataConnectionName")
          @visibility("read")
          name: string;

          @visibility("read")
          createdDate?: utcDateTime;

          frequencyOffset?: int32;
        }

        @discriminator("kind")
        model DataConnectionData {
          name?: string;
          frequencyOffset?: int32;
        }

        interface DataConnections {

          getDataConnection is Operations.ResourceRead<DataConnection>;

          @createsOrReplacesResource(DataConnection)
          @put
          createOrReplaceDataConnection is Foundations.ResourceOperation<
            DataConnection,
            DataConnectionData,
            DataConnection
          >;

          deleteDataConnection is Operations.ResourceDelete<DataConnection>;
        }
      `);
    const sdkPackage = runnerWithCore.context.sdkPackage;
    const nonCoreModels = sdkPackage.models.filter((x) => !isAzureCoreModel(x));
    strictEqual(nonCoreModels.length, 2);

    const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
      ?.response as SdkClientType<SdkHttpOperation>;

    const createOrReplace = client.methods[1];
    strictEqual(createOrReplace.kind, "basic");
    strictEqual(createOrReplace.name, "createOrReplaceDataConnection");
    strictEqual(createOrReplace.parameters.length, 5);
    ok(
      createOrReplace.parameters.find(
        (x) => x.name === "dataConnectionName" && x.type.kind === "string",
      ),
    );
    ok(createOrReplace.parameters.find((x) => x.name === "name" && x.type.kind === "string"));
    ok(
      createOrReplace.parameters.find(
        (x) => x.name === "frequencyOffset" && x.type.kind === "int32",
      ),
    );
    ok(createOrReplace.parameters.find((x) => x.name === "contentType"));
    ok(createOrReplace.parameters.find((x) => x.name === "accept"));

    const opParams = createOrReplace.operation.parameters;
    strictEqual(opParams.length, 4);
    ok(opParams.find((x) => x.isApiVersionParam === true && x.kind === "query"));
    ok(opParams.find((x) => x.kind === "path" && x.serializedName === "dataConnectionName"));
    ok(opParams.find((x) => x.kind === "header" && x.serializedName === "Content-Type"));
    ok(opParams.find((x) => x.kind === "header" && x.serializedName === "Accept"));
    strictEqual(createOrReplace.operation.bodyParam?.type.kind, "model");
    strictEqual(
      createOrReplace.operation.bodyParam?.type.name,
      "CreateOrReplaceDataConnectionRequest",
    );
    strictEqual(
      createOrReplace.operation.bodyParam.correspondingMethodParams[0],
      createOrReplace.parameters[1],
    );
    strictEqual(
      createOrReplace.operation.bodyParam.correspondingMethodParams[1],
      createOrReplace.parameters[2],
    );
    strictEqual(createOrReplace.operation.responses.length, 1);
    const response200 = createOrReplace.operation.responses.find((x) => x.statusCodes === 200);
    ok(response200);
    ok(response200.type);
    strictEqual(response200.type.kind, "model");
    strictEqual(response200.type.name, "DataConnection");
  });

  it("model with @body decorator", async () => {
    await runner.compileWithBuiltInService(`
        model Shelf {
          name: string;
          theme?: string;
        }
        model CreateShelfRequest {
          @body
          body: Shelf;
        }
        op createShelf(...CreateShelfRequest): Shelf;
        `);
    const method = getServiceMethodOfClient(runner.context.sdkPackage);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const shelfModel = models.find((x) => x.name === "Shelf");
    ok(shelfModel);
    strictEqual(method.parameters.length, 3);
    const shelfParameter = method.parameters[0];
    strictEqual(shelfParameter.kind, "method");
    strictEqual(shelfParameter.name, "body");
    strictEqual(shelfParameter.optional, false);
    strictEqual(shelfParameter.isGeneratedName, false);
    deepStrictEqual(shelfParameter.type, shelfModel);
    const contentTypeMethoParam = method.parameters.find((x) => x.name === "contentType");
    ok(contentTypeMethoParam);
    const acceptMethodParam = method.parameters.find((x) => x.name === "accept");
    ok(acceptMethodParam);

    const op = method.operation;
    strictEqual(op.parameters.length, 2);
    ok(
      op.parameters.find(
        (x) =>
          x.kind === "header" &&
          x.serializedName === "Content-Type" &&
          x.correspondingMethodParams[0] === contentTypeMethoParam,
      ),
    );
    ok(
      op.parameters.find(
        (x) =>
          x.kind === "header" &&
          x.serializedName === "Accept" &&
          x.correspondingMethodParams[0] === acceptMethodParam,
      ),
    );

    const bodyParam = op.bodyParam;
    ok(bodyParam);
    strictEqual(bodyParam.kind, "body");
    strictEqual(bodyParam.name, "body");
    strictEqual(bodyParam.optional, false);
    strictEqual(bodyParam.isGeneratedName, false);
    deepStrictEqual(bodyParam.type, shelfModel);
    deepStrictEqual(bodyParam.correspondingMethodParams[0], shelfParameter);
  });
  it("formdata model without body decorator in spread model", async () => {
    await runner.compileWithBuiltInService(`

      model DocumentTranslateContent {
        @header contentType: "multipart/form-data";
        document: bytes;
      }
      alias Intersected = DocumentTranslateContent & {};
      op test(...Intersected): void;
      `);
    const method = getServiceMethodOfClient(runner.context.sdkPackage);
    const documentMethodParam = method.parameters.find((x) => x.name === "document");
    ok(documentMethodParam);
    strictEqual(documentMethodParam.kind, "method");
    const op = method.operation;
    ok(op.bodyParam);
    strictEqual(op.bodyParam.kind, "body");
    strictEqual(op.bodyParam.name, "testRequest");
    deepStrictEqual(op.bodyParam.correspondingMethodParams, [documentMethodParam]);

    const anonymousModel = runner.context.sdkPackage.models[0];
    strictEqual(anonymousModel.properties.length, 1);
    strictEqual(anonymousModel.properties[0].kind, "property");
    strictEqual(anonymousModel.properties[0].isMultipartFileInput, true);
    ok(anonymousModel.properties[0].multipartOptions);
    strictEqual(anonymousModel.properties[0].multipartOptions.isFilePart, true);
    strictEqual(anonymousModel.properties[0].multipartOptions.isMulti, false);
  });

  it("anonymous model with @body should not be spread", async () => {
    await runner.compileWithBuiltInService(`
        op test(@body body: {prop: string}): void;
        `);
    const method = getServiceMethodOfClient(runner.context.sdkPackage);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const model = models.find((x) => x.name === "TestRequest");
    ok(model);
    strictEqual(model.usage, UsageFlags.Input | UsageFlags.Json);

    strictEqual(method.parameters.length, 2);
    const param = method.parameters[0];
    strictEqual(param.kind, "method");
    strictEqual(param.name, "body");
    strictEqual(param.optional, false);
    strictEqual(param.isGeneratedName, false);
    deepStrictEqual(param.type, model);
    const contentTypeMethoParam = method.parameters.find((x) => x.name === "contentType");
    ok(contentTypeMethoParam);

    const op = method.operation;
    strictEqual(op.parameters.length, 1);
    ok(
      op.parameters.find(
        (x) =>
          x.kind === "header" &&
          x.serializedName === "Content-Type" &&
          x.correspondingMethodParams[0] === contentTypeMethoParam,
      ),
    );

    const bodyParam = op.bodyParam;
    ok(bodyParam);
    strictEqual(bodyParam.kind, "body");
    strictEqual(bodyParam.name, "body");
    strictEqual(bodyParam.optional, false);
    strictEqual(bodyParam.isGeneratedName, false);
    deepStrictEqual(bodyParam.type, model);
    deepStrictEqual(bodyParam.correspondingMethodParams[0].type, model);
  });

  it("anonymous model from spread with @bodyRoot should not be spread", async () => {
    await runner.compileWithBuiltInService(`
        model Test {
          prop: string;
        }
        op test(@bodyRoot body: {...Test}): void;
        `);
    const method = getServiceMethodOfClient(runner.context.sdkPackage);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const model = models.find((x) => x.name === "TestRequest");
    ok(model);
    strictEqual(model.usage, UsageFlags.Input | UsageFlags.Json);

    strictEqual(method.parameters.length, 2);
    const param = method.parameters[0];
    strictEqual(param.kind, "method");
    strictEqual(param.name, "body");
    strictEqual(param.optional, false);
    strictEqual(param.isGeneratedName, false);
    deepStrictEqual(param.type, model);
    const contentTypeMethoParam = method.parameters.find((x) => x.name === "contentType");
    ok(contentTypeMethoParam);

    const op = method.operation;
    strictEqual(op.parameters.length, 1);
    ok(
      op.parameters.find(
        (x) =>
          x.kind === "header" &&
          x.serializedName === "Content-Type" &&
          x.correspondingMethodParams[0] === contentTypeMethoParam,
      ),
    );

    const bodyParam = op.bodyParam;
    ok(bodyParam);
    strictEqual(bodyParam.kind, "body");
    strictEqual(bodyParam.name, "body");
    strictEqual(bodyParam.optional, false);
    strictEqual(bodyParam.isGeneratedName, false);
    deepStrictEqual(bodyParam.type, model);
    deepStrictEqual(bodyParam.correspondingMethodParams[0].type, model);
  });

  it("implicit spread", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        op myOp(a: string, b: string): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);

    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 3);

    const a = method.parameters.find((x) => x.name === "a");
    ok(a);
    strictEqual(a.kind, "method");
    strictEqual(a.optional, false);
    strictEqual(a.onClient, false);
    strictEqual(a.isApiVersionParam, false);
    strictEqual(a.type.kind, "string");

    const b = method.parameters.find((x) => x.name === "b");
    ok(b);
    strictEqual(b.kind, "method");
    strictEqual(b.optional, false);
    strictEqual(b.onClient, false);
    strictEqual(b.isApiVersionParam, false);
    strictEqual(b.type.kind, "string");

    const serviceOperation = method.operation;
    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);

    strictEqual(bodyParameter.kind, "body");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, false);
    strictEqual(bodyParameter.type, sdkPackage.models[0]);
    strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
    strictEqual(bodyParameter.type.access, "internal");

    strictEqual(bodyParameter.correspondingMethodParams.length, 2);
    deepStrictEqual(bodyParameter.correspondingMethodParams[0], a);
    deepStrictEqual(bodyParameter.correspondingMethodParams[1], b);
  });

  it("implicit spread with metadata", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        op myOp(@header a: string, b: string): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);

    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 3);

    const a = method.parameters.find((x) => x.name === "a");
    ok(a);
    strictEqual(a.kind, "method");
    strictEqual(a.optional, false);
    strictEqual(a.onClient, false);
    strictEqual(a.isApiVersionParam, false);
    strictEqual(a.type.kind, "string");

    const b = method.parameters.find((x) => x.name === "b");
    ok(b);
    strictEqual(b.kind, "method");
    strictEqual(b.optional, false);
    strictEqual(b.onClient, false);
    strictEqual(b.isApiVersionParam, false);
    strictEqual(b.type.kind, "string");

    const serviceOperation = method.operation;
    const headerParameter = serviceOperation.parameters.find((p) => (p.name = "a"));
    ok(headerParameter);
    strictEqual(headerParameter.kind, "header");
    strictEqual(headerParameter.onClient, false);
    strictEqual(headerParameter.optional, false);
    strictEqual(headerParameter.type.kind, "string");

    strictEqual(headerParameter.correspondingMethodParams.length, 1);
    deepStrictEqual(headerParameter.correspondingMethodParams[0], a);

    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);

    strictEqual(bodyParameter.kind, "body");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, false);
    strictEqual(bodyParameter.type, sdkPackage.models[0]);
    strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
    strictEqual(bodyParameter.type.access, "internal");

    strictEqual(bodyParameter.correspondingMethodParams.length, 1);
    deepStrictEqual(bodyParameter.correspondingMethodParams[0], b);
  });

  it("explicit spread", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        model Test {
          a: string;
          b: string;
        }
        op myOp(...Test): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);

    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 3);

    const a = method.parameters.find((x) => x.name === "a");
    ok(a);
    strictEqual(a.kind, "method");
    strictEqual(a.optional, false);
    strictEqual(a.onClient, false);
    strictEqual(a.isApiVersionParam, false);
    strictEqual(a.type.kind, "string");

    const b = method.parameters.find((x) => x.name === "b");
    ok(b);
    strictEqual(b.kind, "method");
    strictEqual(b.optional, false);
    strictEqual(b.onClient, false);
    strictEqual(b.isApiVersionParam, false);
    strictEqual(b.type.kind, "string");

    const serviceOperation = method.operation;
    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);

    strictEqual(bodyParameter.kind, "body");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, false);
    strictEqual(bodyParameter.type, sdkPackage.models[0]);
    strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
    strictEqual(bodyParameter.type.access, "internal");

    strictEqual(bodyParameter.correspondingMethodParams.length, 2);
    deepStrictEqual(bodyParameter.correspondingMethodParams[0], a);
    deepStrictEqual(bodyParameter.correspondingMethodParams[1], b);
  });

  it("explicit spread with metadata", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        model Test {
          @header
          a: string;
          b: string;
        }
        op myOp(...Test): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);

    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 3);

    const a = method.parameters.find((x) => x.name === "a");
    ok(a);
    strictEqual(a.kind, "method");
    strictEqual(a.optional, false);
    strictEqual(a.onClient, false);
    strictEqual(a.isApiVersionParam, false);
    strictEqual(a.type.kind, "string");

    const b = method.parameters.find((x) => x.name === "b");
    ok(b);
    strictEqual(b.kind, "method");
    strictEqual(b.optional, false);
    strictEqual(b.onClient, false);
    strictEqual(b.isApiVersionParam, false);
    strictEqual(b.type.kind, "string");

    const serviceOperation = method.operation;
    const headerParameter = serviceOperation.parameters.find((p) => (p.name = "a"));
    ok(headerParameter);
    strictEqual(headerParameter.kind, "header");
    strictEqual(headerParameter.onClient, false);
    strictEqual(headerParameter.optional, false);
    strictEqual(headerParameter.type.kind, "string");

    strictEqual(headerParameter.correspondingMethodParams.length, 1);
    deepStrictEqual(headerParameter.correspondingMethodParams[0], a);

    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);

    strictEqual(bodyParameter.kind, "body");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, false);
    strictEqual(bodyParameter.type, sdkPackage.models[0]);
    strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
    strictEqual(bodyParameter.type.access, "internal");

    strictEqual(bodyParameter.correspondingMethodParams.length, 1);
    deepStrictEqual(bodyParameter.correspondingMethodParams[0], b);
  });

  it("explicit multiple spread", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        model Test1 {
          a: string;
          
        }

        model Test2 {
          b: string;
        }
        op myOp(...Test1, ...Test2): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);

    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 3);

    const a = method.parameters.find((x) => x.name === "a");
    ok(a);
    strictEqual(a.kind, "method");
    strictEqual(a.optional, false);
    strictEqual(a.onClient, false);
    strictEqual(a.isApiVersionParam, false);
    strictEqual(a.type.kind, "string");

    const b = method.parameters.find((x) => x.name === "b");
    ok(b);
    strictEqual(b.kind, "method");
    strictEqual(b.optional, false);
    strictEqual(b.onClient, false);
    strictEqual(b.isApiVersionParam, false);
    strictEqual(b.type.kind, "string");

    const serviceOperation = method.operation;
    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);

    strictEqual(bodyParameter.kind, "body");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, false);
    strictEqual(bodyParameter.type, sdkPackage.models[0]);
    strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
    strictEqual(bodyParameter.type.access, "internal");

    strictEqual(bodyParameter.correspondingMethodParams.length, 2);
    deepStrictEqual(bodyParameter.correspondingMethodParams[0], a);
    deepStrictEqual(bodyParameter.correspondingMethodParams[1], b);
  });

  it("explicit multiple spread with metadata", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
        model Test1 {
          @header
          a: string;
        }
        model Test2 {
          b: string;
        }
        op myOp(...Test1, ...Test2): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);

    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "myOp");
    strictEqual(method.kind, "basic");
    strictEqual(method.parameters.length, 3);

    const a = method.parameters.find((x) => x.name === "a");
    ok(a);
    strictEqual(a.kind, "method");
    strictEqual(a.optional, false);
    strictEqual(a.onClient, false);
    strictEqual(a.isApiVersionParam, false);
    strictEqual(a.type.kind, "string");

    const b = method.parameters.find((x) => x.name === "b");
    ok(b);
    strictEqual(b.kind, "method");
    strictEqual(b.optional, false);
    strictEqual(b.onClient, false);
    strictEqual(b.isApiVersionParam, false);
    strictEqual(b.type.kind, "string");

    const serviceOperation = method.operation;
    const headerParameter = serviceOperation.parameters.find((p) => (p.name = "a"));
    ok(headerParameter);
    strictEqual(headerParameter.kind, "header");
    strictEqual(headerParameter.onClient, false);
    strictEqual(headerParameter.optional, false);
    strictEqual(headerParameter.type.kind, "string");

    strictEqual(headerParameter.correspondingMethodParams.length, 1);
    deepStrictEqual(headerParameter.correspondingMethodParams[0], a);

    const bodyParameter = serviceOperation.bodyParam;
    ok(bodyParameter);

    strictEqual(bodyParameter.kind, "body");
    strictEqual(bodyParameter.onClient, false);
    strictEqual(bodyParameter.optional, false);
    strictEqual(bodyParameter.type, sdkPackage.models[0]);
    strictEqual(bodyParameter.type.usage, UsageFlags.Spread | UsageFlags.Json);
    strictEqual(bodyParameter.type.access, "internal");

    strictEqual(bodyParameter.correspondingMethodParams.length, 1);
    deepStrictEqual(bodyParameter.correspondingMethodParams[0], b);
  });

  it("spread idempotent", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
          alias FooAlias = {
              @path id: string;
              @doc("name of the Foo")
              name: string;
          };
          op test(...FooAlias): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);
    getAllModels(runner.context);

    strictEqual(sdkPackage.models[0].name, "TestRequest");
    strictEqual(sdkPackage.models[0].usage, UsageFlags.Spread | UsageFlags.Json);
  });

  it("model used as simple spread", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
          model Test {
            prop: string;
          }
          op test(...Test): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);
    getAllModels(runner.context);

    strictEqual(sdkPackage.models[0].name, "Test");
    strictEqual(sdkPackage.models[0].usage, UsageFlags.Spread | UsageFlags.Json);
    strictEqual(sdkPackage.models[0].access, "internal");
  });

  it("model used as simple spread and output", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
          model Test {
            prop: string;
          }
          op test(...Test): Test;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);
    getAllModels(runner.context);

    strictEqual(sdkPackage.models[0].name, "Test");
    strictEqual(
      sdkPackage.models[0].usage,
      UsageFlags.Spread | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(sdkPackage.models[0].access, "public");
  });

  it("model used as simple spread and other operation's output", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
          model Test {
            prop: string;
          }
          op test(...Test): void;

          @route("/another")
          op another(): Test;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);
    getAllModels(runner.context);

    strictEqual(sdkPackage.models[0].name, "Test");
    strictEqual(
      sdkPackage.models[0].usage,
      UsageFlags.Spread | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(sdkPackage.models[0].access, "public");
  });

  it("model used as simple spread and other operation's input", async () => {
    await runner.compile(`@server("http://localhost:3000", "endpoint")
        @service({})
        namespace My.Service;
          model Test {
            prop: string;
          }
          op test(...Test): void;

          @route("/another")
          op another(@body body: Test): void;
        `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 1);
    getAllModels(runner.context);

    strictEqual(sdkPackage.models[0].name, "Test");
    strictEqual(sdkPackage.models[0].usage, UsageFlags.Spread | UsageFlags.Input | UsageFlags.Json);
    strictEqual(sdkPackage.models[0].access, "public");
  });

  it("model used as simple spread with versioning", async () => {
    await runner.compile(`
      @server("http://localhost:3000", "endpoint")
      @service({})
      @versioned(ServiceApiVersions)
      namespace My.Service;
      
      enum ServiceApiVersions {
        v2022_06_01_preview: "2022-06-01-preview",
      }
      
      model Test {
        name: string;
      }
      
      model Ref {
        prop: Test;
      }
      
      @route("modelref1")
      @post
      op ref1(...Test): void;

      @route("modelref2")
      @post
      op ref2(@header header: string, ...Test): void;
    
      @route("modelref3")
      @post
      op ref3(@body body: Ref): void;
    `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 2);
    getAllModels(runner.context);

    strictEqual(sdkPackage.models[0].name, "Test");
    strictEqual(sdkPackage.models[0].usage, UsageFlags.Spread | UsageFlags.Input | UsageFlags.Json);
    strictEqual(sdkPackage.models[0].access, "public");

    strictEqual(sdkPackage.models[1].name, "Ref");
    strictEqual(sdkPackage.models[1].usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(sdkPackage.models[1].access, "public");

    const client = sdkPackage.clients[0];
    deepStrictEqual(
      (client.methods[0] as SdkServiceMethod<SdkHttpOperation>).operation.bodyParam?.type,
      sdkPackage.models[0],
    );
    deepStrictEqual(
      (client.methods[1] as SdkServiceMethod<SdkHttpOperation>).operation.bodyParam?.type,
      sdkPackage.models[0],
    );
    deepStrictEqual(
      (client.methods[2] as SdkServiceMethod<SdkHttpOperation>).operation.bodyParam?.type,
      sdkPackage.models[1],
    );
  });
});
