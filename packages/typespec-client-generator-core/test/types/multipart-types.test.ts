import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkBodyModelPropertyType,
  SdkClientType,
  SdkHttpOperation,
  UsageFlags,
} from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: multipart types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  it("multipart form basic", async function () {
    await runner.compileWithBuiltInService(`
      model MultiPartRequest {
        id: string;
        profileImage: bytes;
      }

      op basic(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const model = models[0];
    strictEqual(model.kind, "model");
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
    ok(profileImage.multipartOptions);
    strictEqual(profileImage.multipartOptions.isFilePart, true);
  });
  it("multipart conflicting model usage", async function () {
    await runner.compile(
      `
        @service({title: "Test Service"}) namespace TestService;
        model MultiPartRequest {
          id: string;
          profileImage: bytes;
        }
  
        @put op jsonUse(@body body: MultiPartRequest): NoContentResponse;
        @post op multipartUse(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
      `
    );
    expectDiagnostics(runner.context.diagnostics, {
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const modelA = models.find((x) => x.name === "A");
    ok(modelA);
    strictEqual(modelA.kind, "model");
    strictEqual(modelA.usage, UsageFlags.MultipartFormData | UsageFlags.Spread);
    strictEqual(modelA.properties.length, 1);
    const modelAProp = modelA.properties[0];
    strictEqual(modelAProp.kind, "property");
    strictEqual(modelAProp.isMultipartFileInput, true);
    ok(modelAProp.multipartOptions);
    strictEqual(modelAProp.multipartOptions.isFilePart, true);

    const modelB = models.find((x) => x.name === "B");
    ok(modelB);
    strictEqual(modelB.kind, "model");
    strictEqual(modelB.usage, UsageFlags.Spread | UsageFlags.Json);
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
        model AddressSecondAppearance {
          address: Address;
        }
        
        @put op multipartOne(@header contentType: "multipart/form-data", @body body: AddressFirstAppearance): void;
        `
    );
    const models = runner.context.sdkPackage.models;
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const model = models[0];
    strictEqual(model.properties.length, 1);
    const pictures = model.properties[0];
    strictEqual(pictures.kind, "property");
    strictEqual(pictures.isMultipartFileInput, true);
    ok(pictures.multipartOptions);
    strictEqual(pictures.multipartOptions.isFilePart, true);
    strictEqual(pictures.multipartOptions.isMulti, true);
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);

    const pictureWrapper = models.find((x) => x.name === "PictureWrapper");
    ok(pictureWrapper);
    ok((pictureWrapper.usage & UsageFlags.MultipartFormData) > 0);

    const errorResponse = models.find((x) => x.name === "ErrorResponse");
    ok(errorResponse);
    strictEqual(errorResponse.kind, "model");
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
    const client = runner.context.sdkPackage.clients[0].methods.find(
      (x) => x.kind === "clientaccessor"
    )?.response as SdkClientType<SdkHttpOperation>;
    const formDataMethod = client.methods[0];
    strictEqual(formDataMethod.kind, "basic");
    strictEqual(formDataMethod.name, "upload");
    strictEqual(formDataMethod.parameters.length, 6);

    strictEqual(formDataMethod.parameters[0].name, "name");
    strictEqual(formDataMethod.parameters[0].type.kind, "string");

    strictEqual(formDataMethod.parameters[1].name, "displayName");
    strictEqual(formDataMethod.parameters[1].type.kind, "string");

    strictEqual(formDataMethod.parameters[2].name, "description");
    strictEqual(formDataMethod.parameters[2].type.kind, "string");

    strictEqual(formDataMethod.parameters[3].name, "color");
    strictEqual(formDataMethod.parameters[3].type.kind, "string");

    strictEqual(formDataMethod.parameters[4].name, "contentType");
    strictEqual(formDataMethod.parameters[4].type.kind, "constant");
    strictEqual(formDataMethod.parameters[4].type.value, "multipart/form-data");

    strictEqual(formDataMethod.parameters[5].name, "accept");
    strictEqual(formDataMethod.parameters[5].type.kind, "constant");
    strictEqual(formDataMethod.parameters[5].type.value, "application/json");

    const formDataOp = formDataMethod.operation;
    strictEqual(formDataOp.parameters.length, 2);
    ok(formDataOp.parameters.find((x) => x.name === "accept" && x.kind === "header"));
    ok(formDataOp.parameters.find((x) => x.name === "contentType" && x.kind === "header"));

    const formDataBodyParam = formDataOp.bodyParam;
    ok(formDataBodyParam);
    strictEqual(formDataBodyParam.type.kind, "model");
    strictEqual(formDataBodyParam.type.name, "UploadRequest");
    strictEqual(formDataBodyParam.correspondingMethodParams.length, 4);
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
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const multiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(multiPartRequest);
    ok(multiPartRequest.usage & UsageFlags.MultipartFormData);

    const address = models.find((x) => x.name === "Address");
    ok(address);
    strictEqual(address.usage & UsageFlags.MultipartFormData, 0);
  });

  it("Json[] and bytes[] in multipart/form-data", async function () {
    await runner.compileWithBuiltInService(`
        model MultiPartRequest {
          profileImages: bytes[];
          addresses: Address[];
        }
        model Address {
          city: string;
        }
        @post
        op upload(@header contentType: "multipart/form-data", @body body: MultiPartRequest): void;
        `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const multiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(multiPartRequest);

    for (const p of multiPartRequest.properties.values()) {
      strictEqual(p.kind, "property");
      ok(p.multipartOptions);
      ok(p.type.kind === "array");
      strictEqual(p.multipartOptions.isMulti, true);
    }
  });

  it("basic multipart with @multipartBody for model", async function () {
    await runner.compileWithBuiltInService(`
        model Address {
          city: string;
        }
        model MultiPartRequest{
          id?: HttpPart<string>;
          profileImage: HttpPart<bytes>;
          address: HttpPart<Address>;
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    ok(MultiPartRequest.usage & UsageFlags.MultipartFormData);
    const id = MultiPartRequest.properties.find((x) => x.name === "id") as SdkBodyModelPropertyType;
    strictEqual(id.optional, true);
    ok(id.multipartOptions);
    strictEqual(id.multipartOptions.isFilePart, false);
    deepEqual(id.multipartOptions.defaultContentTypes, ["text/plain"]);
    const profileImage = MultiPartRequest.properties.find(
      (x) => x.name === "profileImage"
    ) as SdkBodyModelPropertyType;
    strictEqual(profileImage.optional, false);
    ok(profileImage.multipartOptions);
    strictEqual(profileImage.multipartOptions.isFilePart, true);
    strictEqual(profileImage.multipartOptions.filename, undefined);
    strictEqual(profileImage.multipartOptions.contentType, undefined);
    deepEqual(profileImage.multipartOptions.defaultContentTypes, ["application/octet-stream"]);
    const address = MultiPartRequest.properties.find(
      (x) => x.name === "address"
    ) as SdkBodyModelPropertyType;
    strictEqual(address.optional, false);
    ok(address.multipartOptions);
    strictEqual(address.multipartOptions.isFilePart, false);
    deepEqual(address.multipartOptions.defaultContentTypes, ["application/json"]);
    strictEqual(address.type.kind, "model");
  });

  it("File[] of multipart with @multipartBody for model", async function () {
    await runner.compileWithBuiltInService(`
        model MultiPartRequest{
            fileArrayOnePart: HttpPart<File[]>;
            fileArrayMultiParts: HttpPart<File>[];
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    const fileArrayOnePart = MultiPartRequest.properties.find(
      (x) => x.name === "fileArrayOnePart"
    ) as SdkBodyModelPropertyType;
    ok(fileArrayOnePart);
    ok(fileArrayOnePart.multipartOptions);
    strictEqual(fileArrayOnePart.type.kind, "array");
    strictEqual(fileArrayOnePart.type.valueType.kind, "model");
    strictEqual(fileArrayOnePart.multipartOptions.isMulti, false);
    strictEqual(fileArrayOnePart.multipartOptions.filename, undefined);
    strictEqual(fileArrayOnePart.multipartOptions.contentType, undefined);
    // Maybe we won't meet this case in real world, but we still need to test it.
    deepEqual(fileArrayOnePart.multipartOptions.defaultContentTypes, ["application/json"]);

    const fileArrayMultiParts = MultiPartRequest.properties.find(
      (x) => x.name === "fileArrayMultiParts"
    ) as SdkBodyModelPropertyType;
    ok(fileArrayMultiParts);
    ok(fileArrayMultiParts.multipartOptions);
    strictEqual(fileArrayMultiParts.type.kind, "array");
    strictEqual(fileArrayMultiParts.type.valueType.kind, "model");
    strictEqual(fileArrayMultiParts.multipartOptions.isMulti, true);
    ok(fileArrayMultiParts.multipartOptions.filename);
    strictEqual(fileArrayMultiParts.multipartOptions.filename.optional, true);
    ok(fileArrayMultiParts.multipartOptions.contentType);
    strictEqual(fileArrayMultiParts.multipartOptions.contentType.optional, true);
    // Typespec compiler will set default content type to ["*/*"] for "HttpPart<File>[]"
    deepEqual(fileArrayMultiParts.multipartOptions.defaultContentTypes, ["*/*"]);
  });

  it("File with specific content-type", async function () {
    await runner.compileWithBuiltInService(`
      model RequiredMetaData extends File {
        filename: string;
        contentType: "image/png";
      }
      model MultiPartRequest{
          file: HttpPart<RequiredMetaData>;
      }
      @post
      op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
      `);
    const models = runner.context.sdkPackage.models;
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    const fileOptionalFileName = MultiPartRequest.properties.find(
      (x) => x.name === "file"
    ) as SdkBodyModelPropertyType;
    ok(fileOptionalFileName);
    ok(fileOptionalFileName.multipartOptions);
    deepEqual(fileOptionalFileName.multipartOptions.defaultContentTypes, ["image/png"]);
  });

  it("File of multipart with @multipartBody for model", async function () {
    await runner.compileWithBuiltInService(`
        model RequiredMetaData extends File {
          filename: string;
          contentType: string;
        }
        model MultiPartRequest{
            fileOptionalFileName: HttpPart<File>;
            fileRequiredFileName: HttpPart<RequiredMetaData>;
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    ok(MultiPartRequest.usage & UsageFlags.MultipartFormData);
    const fileOptionalFileName = MultiPartRequest.properties.find(
      (x) => x.name === "fileOptionalFileName"
    ) as SdkBodyModelPropertyType;
    ok(fileOptionalFileName);
    strictEqual(fileOptionalFileName.optional, false);
    ok(fileOptionalFileName.multipartOptions);
    strictEqual(fileOptionalFileName.name, "fileOptionalFileName");
    strictEqual(fileOptionalFileName.multipartOptions.isFilePart, true);
    ok(fileOptionalFileName.multipartOptions.filename);
    strictEqual(fileOptionalFileName.multipartOptions.filename.optional, true);
    ok(fileOptionalFileName.multipartOptions.contentType);
    strictEqual(fileOptionalFileName.multipartOptions.contentType.optional, true);

    const fileRequiredFileName = MultiPartRequest.properties.find(
      (x) => x.name === "fileRequiredFileName"
    ) as SdkBodyModelPropertyType;
    ok(fileRequiredFileName);
    strictEqual(fileRequiredFileName.optional, false);
    ok(fileRequiredFileName.multipartOptions);
    strictEqual(fileRequiredFileName.name, "fileRequiredFileName");
    strictEqual(fileRequiredFileName.multipartOptions.isFilePart, true);
    ok(fileRequiredFileName.multipartOptions.filename);
    strictEqual(fileRequiredFileName.multipartOptions.filename.optional, false);
    ok(fileRequiredFileName.multipartOptions.contentType);
    strictEqual(fileRequiredFileName.multipartOptions.contentType.optional, false);
  });

  it("with FileWithRequiredMetadata of Azure.Core", async function () {
    const runnerCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      emitterName: "@azure-tools/typespec-java",
      autoUsings: ["Azure.Core"],
    });
    await runnerCore.compileWithBuiltInService(`
        model MultiPartRequest{
            fileOptionalFileName: HttpPart<File>;
            fileRequiredFileName: HttpPart<FileWithRequiredMetadata>;
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const models = runnerCore.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    ok(MultiPartRequest.usage & UsageFlags.MultipartFormData);
    const fileOptionalFileName = MultiPartRequest.properties.find(
      (x) => x.name === "fileOptionalFileName"
    ) as SdkBodyModelPropertyType;
    ok(fileOptionalFileName);
    strictEqual(fileOptionalFileName.optional, false);
    ok(fileOptionalFileName.multipartOptions);
    strictEqual(fileOptionalFileName.name, "fileOptionalFileName");
    strictEqual(fileOptionalFileName.multipartOptions.isFilePart, true);
    ok(fileOptionalFileName.multipartOptions.filename);
    strictEqual(fileOptionalFileName.multipartOptions.filename.optional, true);
    ok(fileOptionalFileName.multipartOptions.contentType);
    strictEqual(fileOptionalFileName.multipartOptions.contentType.optional, true);

    const fileRequiredFileName = MultiPartRequest.properties.find(
      (x) => x.name === "fileRequiredFileName"
    ) as SdkBodyModelPropertyType;
    ok(fileRequiredFileName);
    strictEqual(fileRequiredFileName.optional, false);
    ok(fileRequiredFileName.multipartOptions);
    strictEqual(fileRequiredFileName.name, "fileRequiredFileName");
    strictEqual(fileRequiredFileName.multipartOptions.isFilePart, true);
    ok(fileRequiredFileName.multipartOptions.filename);
    strictEqual(fileRequiredFileName.multipartOptions.filename.optional, false);
    ok(fileRequiredFileName.multipartOptions.contentType);
    strictEqual(fileRequiredFileName.multipartOptions.contentType.optional, false);
  });

  it("check 'multi' of multipart with @multipartBody for model", async function () {
    await runner.compileWithBuiltInService(`
        model Address {
          city: string;
        }
        model MultiPartRequest {
            stringsOnePart: HttpPart<string[]>;
            stringsMultiParts: HttpPart<string>[];
            bytesOnePart: HttpPart<bytes[]>;
            bytesMultiParts: HttpPart<bytes>[];
            addressesOnePart: HttpPart<Address[]>;
            addressesMultiParts: HttpPart<Address>[];
            filesOnePart: HttpPart<File[]>;
            filesMultiParts: HttpPart<File>[];
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    for (const p of MultiPartRequest.properties.values()) {
      strictEqual(p.kind, "property");
      ok(p.multipartOptions);
      strictEqual(p.multipartOptions.isMulti, p.name.toLowerCase().includes("multi"));
    }
  });

  it("check returned sdkType of multipart with @multipartBody for model", async function () {
    await runner.compileWithBuiltInService(`
        model MultiPartRequest {
            stringsOnePart: HttpPart<string[]>;
            stringsMultiParts: HttpPart<string>[];
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    const stringsOnePart = MultiPartRequest.properties.find(
      (x) => x.name === "stringsOnePart"
    ) as SdkBodyModelPropertyType;
    ok(stringsOnePart);
    strictEqual(stringsOnePart.type.kind, "array");
    strictEqual(stringsOnePart.type.valueType.kind, "string");
    ok(stringsOnePart.multipartOptions);
    strictEqual(stringsOnePart.multipartOptions.isMulti, false);
    const stringsMultiParts = MultiPartRequest.properties.find(
      (x) => x.name === "stringsMultiParts"
    ) as SdkBodyModelPropertyType;
    ok(stringsMultiParts);
    strictEqual(stringsMultiParts.type.kind, "array");
    strictEqual(stringsMultiParts.type.valueType.kind, "string");
    ok(stringsMultiParts.multipartOptions);
    strictEqual(stringsMultiParts.multipartOptions.isMulti, true);
  });

  it("check content-type in multipart with @multipartBody for model", async function () {
    await runner.compileWithBuiltInService(`
        model MultiPartRequest {
            stringWithoutContentType: HttpPart<string>,
            stringWithContentType: HttpPart<{@body body: string, @header contentType: "text/html"}>,
            bytesWithoutContentType: HttpPart<bytes>,
            bytesWithContentType: HttpPart<{@body body: string, @header contentType: "image/png"}>
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    const stringWithoutContentType = MultiPartRequest.properties.find(
      (x) => x.name === "stringWithoutContentType"
    ) as SdkBodyModelPropertyType;
    ok(stringWithoutContentType);
    strictEqual(stringWithoutContentType.type.kind, "string");
    ok(stringWithoutContentType.multipartOptions);
    strictEqual(stringWithoutContentType.multipartOptions.contentType, undefined);
    deepEqual(stringWithoutContentType.multipartOptions.defaultContentTypes, ["text/plain"]);

    const stringWithContentType = MultiPartRequest.properties.find(
      (x) => x.name === "stringWithContentType"
    ) as SdkBodyModelPropertyType;
    ok(stringWithContentType);
    strictEqual(stringWithContentType.type.kind, "model");
    ok(stringWithContentType.multipartOptions);
    ok(stringWithContentType.multipartOptions.contentType);
    deepEqual(stringWithContentType.multipartOptions.defaultContentTypes, ["text/html"]);

    const bytesWithoutContentType = MultiPartRequest.properties.find(
      (x) => x.name === "bytesWithoutContentType"
    ) as SdkBodyModelPropertyType;
    ok(bytesWithoutContentType);
    strictEqual(bytesWithoutContentType.type.kind, "bytes");
    ok(bytesWithoutContentType.multipartOptions);
    strictEqual(bytesWithoutContentType.multipartOptions.contentType, undefined);
    deepEqual(bytesWithoutContentType.multipartOptions.defaultContentTypes, [
      "application/octet-stream",
    ]);

    const bytesWithContentType = MultiPartRequest.properties.find(
      (x) => x.name === "bytesWithContentType"
    ) as SdkBodyModelPropertyType;
    ok(bytesWithContentType);
    strictEqual(bytesWithContentType.type.kind, "model");
    ok(bytesWithContentType.multipartOptions);
    ok(bytesWithContentType.multipartOptions.contentType);
    deepEqual(bytesWithContentType.multipartOptions.defaultContentTypes, ["image/png"]);
  });

  it("check isFilePart in multipart with @multipartBody for model", async function () {
    await runner.compileWithBuiltInService(`
        model MultiPartRequest {
            bytesRaw: HttpPart<bytes>,
            bytesArrayRaw: HttpPart<bytes>[],
            fileRaw: HttpPart<File>,
            fileArrayRaw: HttpPart<File>[],
            bytesWithBody: HttpPart<{@body body: bytes}>,
            bytesArrayWithBody: HttpPart<{@body body: bytes}>[],
            fileWithBody: HttpPart<{@body body: File}>,
            fileArrayWithBody: HttpPart<{@body body: File}>[],
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const models = runner.context.sdkPackage.models;
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);

    for (const p of MultiPartRequest.properties.values()) {
      strictEqual(p.kind, "property");
      ok(p.multipartOptions);
      strictEqual(p.multipartOptions.isFilePart, true);
      strictEqual(p.multipartOptions.isMulti, p.name.toLowerCase().includes("array"));
    }
  });

  it("check serialized name with @multipartBody for model", async function () {
    await runner.compileWithBuiltInService(`
        model MultiPartRequest {
            name: HttpPart<bytes, #{ name: "serializedName" }>,
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const models = runner.context.sdkPackage.models;
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    const nameProperty = MultiPartRequest.properties.find((x) => x.name === "name");
    ok(nameProperty);
    strictEqual(nameProperty.name, "name");
    strictEqual((nameProperty as SdkBodyModelPropertyType).serializedName, "serializedName");
  });

  it("multipart in client customization", async () => {
    const testCode = [
      `
        @service({title: "Test Service"}) namespace TestService;
        model MultiPartRequest {
          profileImage: bytes;
        }
  
        @post op multipartUse(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
    `,
      `
      namespace Customizations;
      
      @client({name: "FirstOrderClient", service: TestService})
      interface FirstOrder {}

      @client({name: "SecondOrderClient", service: TestService})
      interface SecondOrder {
        myOp is TestService.multipartUse
      }
    `,
    ];

    await runner.compileWithCustomization(testCode[0], testCode[1]);

    const models = runner.context.sdkPackage.models;
    const MultiPartRequest = models.find((x) => x.name === "MultiPartRequest");
    ok(MultiPartRequest);
    const property = MultiPartRequest.properties.find((x) => x.name === "profileImage");
    ok(property);
    strictEqual(property.kind, "property");
    strictEqual(property.isMultipartFileInput, true);
    ok(property.multipartOptions);
    strictEqual(property.multipartOptions.isFilePart, true);
  });
});
