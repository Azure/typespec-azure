import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepEqual, ok, strictEqual } from "assert";
import { afterEach, beforeEach, it } from "vitest";
import {
  SdkBodyModelPropertyType,
  SdkClientType,
  SdkHttpOperation,
  UsageFlags,
} from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
});

afterEach(async () => {
  for (const modelsOrEnums of [runner.context.sdkPackage.models, runner.context.sdkPackage.enums]) {
    for (const item of modelsOrEnums) {
      ok(item.name !== "");
    }
  }
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
  ok(profileImage.serializationOptions.multipart);
  strictEqual(profileImage.serializationOptions.multipart.isFilePart, true);
  strictEqual(profileImage.isMultipartFileInput, true);
  strictEqual(profileImage.multipartOptions, profileImage.serializationOptions.multipart);
});

it("multipart conflicting model usage", async function () {
  await runner.compile(
    `
        @service(#{title: "Test Service"}) namespace TestService;
        model MultiPartRequest {
          id: string;
          profileImage: bytes;
        }
  
        @put op jsonUse(@body body: MultiPartRequest): NoContentResponse;
        @post op multipartUse(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
      `,
  );
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/conflicting-multipart-model-usage",
  });
});

it("multipart conflicting model usage for only multipart operations", async function () {
  await runner.compile(
    `
        @service(#{title: "Test Service"}) namespace TestService;
        model Address {city: string;}
        model MultiPartRequest {
          address: Address;
          id: string;
          profileImage: bytes;
        }
        
        @post
        @route("/basic1") 
        op basic1(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
        @post
        @route("/basic2") 
        op basic2(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
      `,
  );
  deepEqual(runner.context.diagnostics.length, 0);
  const address = runner.context.sdkPackage.models.find((x) => x.name === "Address");
  ok(address);
  deepEqual(address.usage, UsageFlags.Input);
  const multiPartRequest = runner.context.sdkPackage.models.find(
    (x) => x.name === "MultiPartRequest",
  );
  ok(multiPartRequest);
  deepEqual(multiPartRequest.usage, UsageFlags.MultipartFormData | UsageFlags.Input);
});

it("multipart conflicting model usage for mixed operations", async function () {
  await runner.compile(
    `
        @service(#{title: "Test Service"}) namespace TestService;
        model Address {city: string;}
        model RegularRequest {
          address: Address;
        }
        model MultiPartRequest {
          address: Address;
          id: string;
          profileImage: bytes;
        }
        
        @post
        @route("/basic1") 
        op basic1(@body body: RegularRequest): NoContentResponse;
        @post
        @route("/basic2") 
        op basic2(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
      `,
  );
  deepEqual(runner.context.diagnostics.length, 0);
  const address = runner.context.sdkPackage.models.find((x) => x.name === "Address");
  ok(address);
  deepEqual(address.usage, UsageFlags.Input | UsageFlags.Json);
  const multiPartRequest = runner.context.sdkPackage.models.find(
    (x) => x.name === "MultiPartRequest",
  );
  ok(multiPartRequest);
  deepEqual(multiPartRequest.usage, UsageFlags.MultipartFormData | UsageFlags.Input);
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
        `,
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

  ok(modelAProp.serializationOptions.multipart);
  strictEqual(modelAProp.serializationOptions.multipart.isFilePart, true);
  strictEqual(modelAProp.multipartOptions, modelAProp.serializationOptions.multipart);
  strictEqual(modelAProp.isMultipartFileInput, true);

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
        `,
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
        `,
  );
  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 1);
  const model = models[0];
  strictEqual(model.properties.length, 1);
  const pictures = model.properties[0];
  strictEqual(pictures.kind, "property");
  ok(pictures.serializationOptions.multipart);
  strictEqual(pictures.serializationOptions.multipart.isFilePart, true);
  strictEqual(pictures.serializationOptions.multipart.isMulti, true);
  strictEqual(pictures.multipartOptions, pictures.serializationOptions.multipart);
  strictEqual(pictures.isMultipartFileInput, true);
});

it("multipart with encoding bytes raises error", async function () {
  await runner.compile(
    `
        @service(#{title: "Test Service"}) namespace TestService;
        model EncodedBytesMFD {
          @encode("base64")
          pictures: bytes;
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: EncodedBytesMFD): void;
        `,
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
        `,
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
    (x) => x.kind === "clientaccessor",
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
    ok(p.serializationOptions.multipart);
    ok(p.type.kind === "array");
    strictEqual(p.serializationOptions.multipart.isMulti, true);
    strictEqual(p.multipartOptions, p.serializationOptions.multipart);
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
  ok(id.serializationOptions.multipart);
  strictEqual(id.serializationOptions.multipart.isFilePart, false);
  deepEqual(id.serializationOptions.multipart.defaultContentTypes, ["text/plain"]);
  strictEqual(id.multipartOptions, id.serializationOptions.multipart);
  const profileImage = MultiPartRequest.properties.find(
    (x) => x.name === "profileImage",
  ) as SdkBodyModelPropertyType;
  strictEqual(profileImage.optional, false);
  ok(profileImage.serializationOptions.multipart);
  strictEqual(profileImage.serializationOptions.multipart.isFilePart, true);
  strictEqual(profileImage.serializationOptions.multipart.filename, undefined);
  strictEqual(profileImage.serializationOptions.multipart.contentType, undefined);
  deepEqual(profileImage.serializationOptions.multipart.defaultContentTypes, [
    "application/octet-stream",
  ]);
  strictEqual(profileImage.multipartOptions, profileImage.serializationOptions.multipart);
  const address = MultiPartRequest.properties.find(
    (x) => x.name === "address",
  ) as SdkBodyModelPropertyType;
  strictEqual(address.optional, false);
  ok(address.serializationOptions.multipart);
  strictEqual(address.serializationOptions.multipart.isFilePart, false);
  deepEqual(address.serializationOptions.multipart.defaultContentTypes, ["application/json"]);
  strictEqual(address.multipartOptions, address.serializationOptions.multipart);
  strictEqual(address.type.kind, "model");

  const city = address.type.properties.find((x) => x.name === "city") as SdkBodyModelPropertyType;
  ok(city);
  ok(city.serializationOptions.json);
  strictEqual(city.serializationOptions.json.name, "city");
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
  const fileModel = models.find((x) => x.name === "File");
  ok(MultiPartRequest);
  ok(fileModel);
  // filename property
  const filenameProperty = fileModel.properties.find(
    (x) => x.name === "filename",
  ) as SdkBodyModelPropertyType;
  // contentType property
  const contentTypeProperty = fileModel.properties.find(
    (x) => x.name === "contentType",
  ) as SdkBodyModelPropertyType;
  const fileArrayOnePart = MultiPartRequest.properties.find(
    (x) => x.name === "fileArrayOnePart",
  ) as SdkBodyModelPropertyType;
  ok(fileArrayOnePart);
  ok(fileArrayOnePart.serializationOptions.multipart);
  strictEqual(fileArrayOnePart.type.kind, "array");
  strictEqual(fileArrayOnePart.type.valueType.kind, "model");
  strictEqual(fileArrayOnePart.serializationOptions.multipart.isMulti, false);
  strictEqual(fileArrayOnePart.serializationOptions.multipart.filename, undefined);
  strictEqual(fileArrayOnePart.serializationOptions.multipart.contentType, undefined);
  // Maybe we won't meet this case in real world, but we still need to test it.
  deepEqual(fileArrayOnePart.serializationOptions.multipart.defaultContentTypes, [
    "application/json",
  ]);
  strictEqual(fileArrayOnePart.multipartOptions, fileArrayOnePart.serializationOptions.multipart);

  const fileArrayMultiParts = MultiPartRequest.properties.find(
    (x) => x.name === "fileArrayMultiParts",
  ) as SdkBodyModelPropertyType;
  ok(fileArrayMultiParts);
  ok(fileArrayMultiParts.serializationOptions.multipart);
  strictEqual(fileArrayMultiParts.type.kind, "array");
  strictEqual(fileArrayMultiParts.type.valueType.kind, "model");
  strictEqual(fileArrayMultiParts.serializationOptions.multipart.isMulti, true);
  ok(fileArrayMultiParts.serializationOptions.multipart.filename);
  strictEqual(fileArrayMultiParts.serializationOptions.multipart.filename.optional, true);
  // assert the filename property here is the same instance that comes from model File
  strictEqual(fileArrayMultiParts.serializationOptions.multipart.filename, filenameProperty);
  ok(fileArrayMultiParts.serializationOptions.multipart.contentType);
  strictEqual(fileArrayMultiParts.serializationOptions.multipart.contentType.optional, true);
  // assert the contentType property here is the same instance that comes from model File
  strictEqual(fileArrayMultiParts.serializationOptions.multipart.contentType, contentTypeProperty);
  // Typespec compiler will set default content type to ["*/*"] for "HttpPart<File>[]"
  deepEqual(fileArrayMultiParts.serializationOptions.multipart.defaultContentTypes, ["*/*"]);
  strictEqual(
    fileArrayMultiParts.multipartOptions,
    fileArrayMultiParts.serializationOptions.multipart,
  );
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
    (x) => x.name === "file",
  ) as SdkBodyModelPropertyType;
  ok(fileOptionalFileName);
  ok(fileOptionalFileName.serializationOptions.multipart);
  deepEqual(fileOptionalFileName.serializationOptions.multipart.defaultContentTypes, ["image/png"]);
  strictEqual(
    fileOptionalFileName.multipartOptions,
    fileOptionalFileName.serializationOptions.multipart,
  );
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
  const fileModel = models.find((x) => x.name === "File");
  ok(MultiPartRequest);
  ok(MultiPartRequest.usage & UsageFlags.MultipartFormData);
  ok(fileModel);
  const fileOptionalFileName = MultiPartRequest.properties.find(
    (x) => x.name === "fileOptionalFileName",
  ) as SdkBodyModelPropertyType;
  ok(fileOptionalFileName);
  const filenameProperty = fileModel.properties.find(
    (p) => p.name === "filename",
  ) as SdkBodyModelPropertyType;
  const contentTypeProperty = fileModel.properties.find(
    (p) => p.name === "contentType",
  ) as SdkBodyModelPropertyType;
  ok(filenameProperty);
  ok(contentTypeProperty);
  strictEqual(fileOptionalFileName.optional, false);
  ok(fileOptionalFileName.serializationOptions.multipart);
  strictEqual(fileOptionalFileName.name, "fileOptionalFileName");
  strictEqual(fileOptionalFileName.serializationOptions.multipart.isFilePart, true);
  ok(fileOptionalFileName.serializationOptions.multipart.filename);
  strictEqual(fileOptionalFileName.serializationOptions.multipart.filename.optional, true);
  // assert the filename property here is the same instance that comes from model File
  strictEqual(fileOptionalFileName.serializationOptions.multipart.filename, filenameProperty);
  ok(fileOptionalFileName.serializationOptions.multipart.contentType);
  strictEqual(fileOptionalFileName.serializationOptions.multipart.contentType.optional, true);
  // assert the contentType property here is the same instance that comes from model File
  strictEqual(fileOptionalFileName.serializationOptions.multipart.contentType, contentTypeProperty);
  strictEqual(
    fileOptionalFileName.multipartOptions,
    fileOptionalFileName.serializationOptions.multipart,
  );

  const requiredMetaDataModel = models.find((x) => x.name === "RequiredMetaData");
  ok(requiredMetaDataModel);
  const fileRequiredFileName = MultiPartRequest.properties.find(
    (x) => x.name === "fileRequiredFileName",
  ) as SdkBodyModelPropertyType;
  const requiredFilenameProperty = requiredMetaDataModel.properties.find(
    (p) => p.name === "filename",
  ) as SdkBodyModelPropertyType;
  const requiredContentTypeProperty = requiredMetaDataModel.properties.find(
    (p) => p.name === "contentType",
  ) as SdkBodyModelPropertyType;
  ok(fileRequiredFileName);
  ok(requiredFilenameProperty);
  ok(requiredContentTypeProperty);
  strictEqual(fileRequiredFileName.optional, false);
  ok(fileRequiredFileName.serializationOptions.multipart);
  strictEqual(fileRequiredFileName.name, "fileRequiredFileName");
  strictEqual(fileRequiredFileName.serializationOptions.multipart.isFilePart, true);
  ok(fileRequiredFileName.serializationOptions.multipart.filename);
  strictEqual(fileRequiredFileName.serializationOptions.multipart.filename.optional, false);
  // assert the filename property here is the same instance that comes from model RequiredMetaData
  strictEqual(
    fileRequiredFileName.serializationOptions.multipart.filename,
    requiredFilenameProperty,
  );
  ok(fileRequiredFileName.serializationOptions.multipart.contentType);
  strictEqual(fileRequiredFileName.serializationOptions.multipart.contentType.optional, false);
  // assert the contentType property here is the same instance that comes from model RequiredMetaData
  strictEqual(
    fileRequiredFileName.serializationOptions.multipart.contentType,
    requiredContentTypeProperty,
  );
  strictEqual(
    fileRequiredFileName.multipartOptions,
    fileRequiredFileName.serializationOptions.multipart,
  );
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
    ok(p.serializationOptions.multipart);
    strictEqual(p.serializationOptions.multipart.isMulti, p.name.toLowerCase().includes("multi"));
    strictEqual(p.multipartOptions, p.serializationOptions.multipart);
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
    (x) => x.name === "stringsOnePart",
  ) as SdkBodyModelPropertyType;
  ok(stringsOnePart);
  strictEqual(stringsOnePart.type.kind, "array");
  strictEqual(stringsOnePart.type.valueType.kind, "string");
  ok(stringsOnePart.serializationOptions.multipart);
  strictEqual(stringsOnePart.serializationOptions.multipart.isMulti, false);
  strictEqual(stringsOnePart.multipartOptions, stringsOnePart.serializationOptions.multipart);
  const stringsMultiParts = MultiPartRequest.properties.find(
    (x) => x.name === "stringsMultiParts",
  ) as SdkBodyModelPropertyType;
  ok(stringsMultiParts);
  strictEqual(stringsMultiParts.type.kind, "array");
  strictEqual(stringsMultiParts.type.valueType.kind, "string");
  ok(stringsMultiParts.serializationOptions.multipart);
  strictEqual(stringsMultiParts.serializationOptions.multipart.isMulti, true);
  strictEqual(stringsMultiParts.multipartOptions, stringsMultiParts.serializationOptions.multipart);
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
    (x) => x.name === "stringWithoutContentType",
  ) as SdkBodyModelPropertyType;
  ok(stringWithoutContentType);
  strictEqual(stringWithoutContentType.type.kind, "string");
  ok(stringWithoutContentType.serializationOptions.multipart);
  strictEqual(stringWithoutContentType.serializationOptions.multipart.contentType, undefined);
  deepEqual(stringWithoutContentType.serializationOptions.multipart.defaultContentTypes, [
    "text/plain",
  ]);
  strictEqual(
    stringWithoutContentType.multipartOptions,
    stringWithoutContentType.serializationOptions.multipart,
  );

  const stringWithContentType = MultiPartRequest.properties.find(
    (x) => x.name === "stringWithContentType",
  ) as SdkBodyModelPropertyType;
  ok(stringWithContentType);
  strictEqual(stringWithContentType.type.kind, "model");
  strictEqual(stringWithContentType.type.name, "MultiPartRequestStringWithContentType");
  ok(stringWithContentType.serializationOptions.multipart);
  ok(stringWithContentType.serializationOptions.multipart.contentType);
  deepEqual(stringWithContentType.serializationOptions.multipart.defaultContentTypes, [
    "text/html",
  ]);
  strictEqual(
    stringWithContentType.multipartOptions,
    stringWithContentType.serializationOptions.multipart,
  );

  const bytesWithoutContentType = MultiPartRequest.properties.find(
    (x) => x.name === "bytesWithoutContentType",
  ) as SdkBodyModelPropertyType;
  ok(bytesWithoutContentType);
  strictEqual(bytesWithoutContentType.type.kind, "bytes");
  ok(bytesWithoutContentType.serializationOptions.multipart);
  strictEqual(bytesWithoutContentType.serializationOptions.multipart.contentType, undefined);
  deepEqual(bytesWithoutContentType.serializationOptions.multipart.defaultContentTypes, [
    "application/octet-stream",
  ]);
  strictEqual(
    bytesWithoutContentType.multipartOptions,
    bytesWithoutContentType.serializationOptions.multipart,
  );

  const bytesWithContentType = MultiPartRequest.properties.find(
    (x) => x.name === "bytesWithContentType",
  ) as SdkBodyModelPropertyType;
  ok(bytesWithContentType);
  strictEqual(bytesWithContentType.type.kind, "model");
  strictEqual(bytesWithContentType.type.name, "MultiPartRequestBytesWithContentType");
  ok(bytesWithContentType.serializationOptions.multipart);
  ok(bytesWithContentType.serializationOptions.multipart.contentType);
  deepEqual(bytesWithContentType.serializationOptions.multipart.defaultContentTypes, ["image/png"]);
  strictEqual(
    bytesWithContentType.multipartOptions,
    bytesWithContentType.serializationOptions.multipart,
  );
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
    ok(p.serializationOptions.multipart);
    strictEqual(p.serializationOptions.multipart.isFilePart, true);
    strictEqual(p.serializationOptions.multipart.isMulti, p.name.toLowerCase().includes("array"));
    strictEqual(p.multipartOptions, p.serializationOptions.multipart);
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
  strictEqual(nameProperty.kind, "property");
  strictEqual((nameProperty as SdkBodyModelPropertyType).serializedName, "serializedName");
  strictEqual(nameProperty.serializationOptions.multipart?.name, "serializedName");
});

it("multipart in client customization", async () => {
  const testCode = [
    `
        @service(#{title: "Test Service"}) namespace TestService;
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
  ok(property.serializationOptions.multipart);
  strictEqual(property.serializationOptions.multipart.isFilePart, true);
  strictEqual(property.multipartOptions, property.serializationOptions.multipart);
  strictEqual(property.isMultipartFileInput, true);
});
