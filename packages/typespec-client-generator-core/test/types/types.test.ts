/* eslint-disable deprecation/deprecation */
import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  UsageFlags,
} from "../../src/interfaces.js";
import {
  getAllModelsWithDiagnostics,
} from "../../src/types.js";
import {
  SdkTestRunner,
  createSdkTestRunner,
} from "../test-host.js";

describe("typespec-client-generator-core: types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  describe("SdkArrayType", () => {
    it("use model is to represent array", async () => {
      await runner.compile(`
        @service({})
        namespace TestClient {
          model TestModel {
            prop: string;
          }
          model TestArray is TestModel[];

          op get(): TestArray;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models[0];
      strictEqual(model.kind, "model");
      strictEqual(model.name, "TestModel");
      const client = runner.context.experimental_sdkPackage.clients[0];
      ok(client);
      const method = client.methods[0];
      ok(method);
      strictEqual(method.response.kind, "method");
      strictEqual(method.response.type?.kind, "array");
      strictEqual(method.response.type?.valueType.kind, "model");
      strictEqual(method.response.type?.valueType.name, "TestModel");
    });
  });

  describe("SdkMultipartFormType", () => {
    it("multipart form basic", async function () {
      await runner.compileWithBuiltInService(`
      model MultiPartRequest {
        id: string;
        profileImage: bytes;
      }

      op basic(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models[0];
      strictEqual(model.kind, "model");
      strictEqual(model.isFormDataType, true);
      ok((model.usage & UsageFlags.MultipartFormData) > 0);
      strictEqual(model.name, "MultiPartRequest");
      strictEqual(model.properties.length, 2);
      const id = model.properties.find((x) => x.name === "id");
      ok(id);
      strictEqual(id.kind, "property");
      strictEqual(id.type.kind, "string");
      const profileImage = model.properties.find((x) => x.name === "profileImage");
      ok(profileImage);
      strictEqual(profileImage.kind, "property");
      strictEqual(profileImage.isMultipartFileInput, true);
    });
    it("multipart conflicting model usage", async function () {
      await runner.compile(
        `
        @service({title: "Test Service"}) namespace TestService;
        model MultiPartRequest {
          id: string;
          profileImage: bytes;
        }
  
        @post op multipartUse(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
        @put op jsonUse(@body body: MultiPartRequest): NoContentResponse;
      `
      );
      const [_, diagnostics] = getAllModelsWithDiagnostics(runner.context);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/conflicting-multipart-model-usage",
      });
    });
    it("multipart resolving conflicting model usage with spread", async function () {
      await runner.compileWithBuiltInService(
        `
        model B {
          doc: bytes
        }
        
        model A {
          ...B
        }
        
        @put op multipartOperation(@header contentType: "multipart/form-data", ...A): void;
        @post op normalOperation(...B): void;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const modelA = models.find((x) => x.name === "A");
      ok(modelA);
      strictEqual(modelA.kind, "model");
      strictEqual(modelA.isFormDataType, true);
      ok((modelA.usage & UsageFlags.MultipartFormData) > 0);
      strictEqual(modelA.properties.length, 1);
      const modelAProp = modelA.properties[0];
      strictEqual(modelAProp.kind, "property");
      strictEqual(modelAProp.isMultipartFileInput, true);

      const modelB = models.find((x) => x.name === "B");
      ok(modelB);
      strictEqual(modelB.kind, "model");
      strictEqual(modelB.isFormDataType, false);
      ok((modelB.usage & UsageFlags.MultipartFormData) === 0);
      strictEqual(modelB.properties.length, 1);
      strictEqual(modelB.properties[0].type.kind, "bytes");
    });

    it("multipart with non-formdata model property", async function () {
      await runner.compileWithBuiltInService(
        `
        model Address {
          city: string;
        }

        model AddressFirstAppearance {
          address: Address;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model AddressSecondAppearance {
          address: Address;
        }
        
        @put op multipartOne(@header contentType: "multipart/form-data", @body body: AddressFirstAppearance): void;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 3);
    });

    it("multipart with list of bytes", async function () {
      await runner.compileWithBuiltInService(
        `
        model PictureWrapper {
          pictures: bytes[];
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: PictureWrapper): void;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models[0];
      strictEqual(model.properties.length, 1);
      const pictures = model.properties[0];
      strictEqual(pictures.kind, "property");
      strictEqual(pictures.isMultipartFileInput, true);
    });

    it("multipart with encoding bytes raises error", async function () {
      await runner.compile(
        `
        @service({title: "Test Service"}) namespace TestService;
        model EncodedBytesMFD {
          @encode("base64")
          pictures: bytes;
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: EncodedBytesMFD): void;
        `
      );
      ok(runner.context.diagnostics?.length);
      expectDiagnostics(runner.context.diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/encoding-multipart-bytes",
      });
    });

    it("multipart with reused error model", async function () {
      await runner.compileWithBuiltInService(
        `
        model PictureWrapper {
          pictures: bytes[];
        }

        model ErrorResponse {
          errorCode: string;
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: PictureWrapper): void | ErrorResponse;
        @post op normalOp(): void | ErrorResponse;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);

      const pictureWrapper = models.find((x) => x.name === "PictureWrapper");
      ok(pictureWrapper);
      strictEqual(pictureWrapper.isFormDataType, true);
      ok((pictureWrapper.usage & UsageFlags.MultipartFormData) > 0);

      const errorResponse = models.find((x) => x.name === "ErrorResponse");
      ok(errorResponse);
      strictEqual(errorResponse.kind, "model");
      strictEqual(errorResponse.isFormDataType, false);
      ok((errorResponse.usage & UsageFlags.MultipartFormData) === 0);
    });

    it("expands model into formData parameters", async function () {
      await runner.compileWithBuiltInService(`
        @doc("A widget.")
        model Widget {
          @key("widgetName")
          name: string;
          displayName: string;
          description: string;
          color: string;
        }

        model WidgetForm is Widget {
          @header("content-type")
          contentType: "multipart/form-data";
        }

        @route("/widgets")
        interface Widgets {
          @route(":upload")
          @post
          upload(...WidgetForm): Widget;
        }
        `);
      const formDataMethod = runner.context.experimental_sdkPackage.clients[0].methods[0];
      strictEqual(formDataMethod.kind, "basic");
      strictEqual(formDataMethod.name, "upload");
      strictEqual(formDataMethod.parameters.length, 3);

      const widgetParam = formDataMethod.parameters.find((x) => x.name === "widget");
      ok(widgetParam);
      ok(formDataMethod.parameters.find((x) => x.name === "accept"));
      strictEqual(formDataMethod.parameters[0].name, "contentType");
      strictEqual(formDataMethod.parameters[0].type.kind, "constant");
      strictEqual(formDataMethod.parameters[0].type.value, "multipart/form-data");
      strictEqual(formDataMethod.parameters[1].name, "widget");
      strictEqual(formDataMethod.parameters[1].type.kind, "model");
      strictEqual(formDataMethod.parameters[1].type.name, "Widget");

      const formDataOp = formDataMethod.operation;
      strictEqual(formDataOp.parameters.length, 2);
      ok(formDataOp.parameters.find((x) => x.name === "accept" && x.kind === "header"));
      ok(formDataOp.parameters.find((x) => x.name === "contentType" && x.kind === "header"));

      const formDataBodyParam = formDataOp.bodyParam;
      ok(formDataBodyParam);
      strictEqual(formDataBodyParam.type.kind, "model");
      strictEqual(formDataBodyParam.type.name, "Widget");
      strictEqual(formDataBodyParam.correspondingMethodParams[0], formDataMethod.parameters[1]);
    });

    it("usage doesn't apply to properties of a form data", async function () {
      await runner.compileWithBuiltInService(`
        model MultiPartRequest {
          id: string;
          profileImage: bytes;
          address: Address;
        }

        model Address {
          city: string;
        }

        @post
        op upload(@header contentType: "multipart/form-data", @body body: MultiPartRequest): void;
        `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const multiPartRequest = models.find((x) => x.name === "MultiPartRequest");
      ok(multiPartRequest);
      ok(multiPartRequest.usage & UsageFlags.MultipartFormData);

      const address = models.find((x) => x.name === "Address");
      ok(address);
      strictEqual(address.usage & UsageFlags.MultipartFormData, 0);
    });
  });
  describe("SdkTupleType", () => {
    it("model with tupled properties", async function () {
      await runner.compileAndDiagnose(`
        @service({})
        namespace MyService;
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model MyFlow {
          scopes: ["https://security.microsoft.com/.default"];
          test: [int32, string]
        }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const scopes = models[0].properties.find((x) => x.name === "scopes");
      ok(scopes);
      strictEqual(scopes.type.kind, "tuple");
      strictEqual(scopes.type.values[0].kind, "constant");
      strictEqual(scopes.type.values[0].valueType.kind, "string");
      strictEqual(scopes.type.values[0].value, "https://security.microsoft.com/.default");
      const test = models[0].properties.find((x) => x.name === "test");
      ok(test);
      strictEqual(test.type.kind, "tuple");
      strictEqual(test.type.values[0].kind, "int32");
      strictEqual(test.type.values[1].kind, "string");
    });
  });
});
