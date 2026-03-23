import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";

it("basic file input", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op uploadFile(@body file: File): void;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "uploadFile");
  const fileMethodParam = method.parameters.find((p) => p.name === "file");
  ok(fileMethodParam);
  strictEqual(fileMethodParam.type.kind, "model");
  const httpOperation = method.operation;
  const bodyParam = httpOperation.bodyParam;
  ok(bodyParam);
  strictEqual(bodyParam.type.kind, "model");
  strictEqual(bodyParam.type.serializationOptions.binary?.isFile, true);
  strictEqual(bodyParam.type.serializationOptions.binary?.isText, false);
  deepStrictEqual(bodyParam.type.serializationOptions.binary?.contentTypes, ["*/*"]);
  ok(bodyParam.type.serializationOptions.binary?.filename);
  strictEqual(bodyParam.type.serializationOptions.binary?.filename.name, "filename");
  const fileModel = context.sdkPackage.models.find((m) => m.name === "File");
  ok(fileModel);
  strictEqual(fileModel.properties.length, 3);
  const contentType = fileModel.properties.find((p) => p.name === "contentType")!;
  strictEqual(contentType.type.kind, "string");
  ok(fileModel.properties.find((p) => p.name === "contents"));
  ok(fileModel.properties.find((p) => p.name === "filename"));
});

it("file input with content type", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op uploadFile(@body file: File<"application/yaml">): void;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "uploadFile");
  const fileMethodParam = method.parameters.find((p) => p.name === "file");
  ok(fileMethodParam);
  strictEqual(fileMethodParam.type.kind, "model");
  const httpOperation = method.operation;
  const bodyParam = httpOperation.bodyParam;
  ok(bodyParam);
  strictEqual(bodyParam.type.kind, "model");
  strictEqual(bodyParam.type.serializationOptions.binary?.isFile, true);
  strictEqual(bodyParam.type.serializationOptions.binary?.isText, false);
  deepStrictEqual(bodyParam.type.serializationOptions.binary?.contentTypes, ["application/yaml"]);
  ok(bodyParam.type.serializationOptions.binary?.filename);
  strictEqual(bodyParam.type.serializationOptions.binary?.filename.name, "filename");
  const fileModel = bodyParam.type;
  const contentType = fileModel.properties.find((p) => p.name === "contentType")!;
  strictEqual(contentType.type.kind, "constant");
  strictEqual(contentType.type.value, "application/yaml");
});

it("basic file output", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op downloadFile(): File;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "downloadFile");
  const httpOperation = method.operation;
  const responseBody = httpOperation.responses[0];
  ok(responseBody);
  strictEqual(responseBody.type!.kind, "model");
  const fileModel = responseBody.type;
  ok(fileModel);
  strictEqual(fileModel.properties.length, 3);
  const contentType = fileModel.properties.find((p) => p.name === "contentType")!;
  strictEqual(contentType.type.kind, "string");
  ok(fileModel.properties.find((p) => p.name === "contents"));
  ok(fileModel.properties.find((p) => p.name === "filename"));
  ok(responseBody.type);
  strictEqual(responseBody.type.serializationOptions.binary?.isFile, true);
  strictEqual(responseBody.type.serializationOptions.binary?.isText, false);
  deepStrictEqual(responseBody.type.serializationOptions.binary?.contentTypes, ["*/*"]);
  ok(responseBody.type.serializationOptions.binary?.filename);
  strictEqual(responseBody.type.serializationOptions.binary?.filename.name, "filename");
});

it("self-defined file", async () => {
  const { program } = await SimpleTesterWithService.compile(
    `
      model SpecFile extends File<"application/json" | "application/yaml", string> {
        // Provide a header that contains the name of the file when created or updated
        @header("x-filename")
        filename: string;
      }
      
      @post op uploadSpec(@bodyRoot spec: SpecFile): void;
      @get op downloadSpec(@path name: string): SpecFile;
      
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  // model
  const specFile = sdkPackage.models.find((m) => m.name === "SpecFile");
  ok(specFile);
  ok(specFile.baseModel);
  strictEqual(specFile.baseModel.name, "File");
  const contentTypeProp = specFile.baseModel.properties.find((p) => p.name === "contentType");
  ok(contentTypeProp);
  strictEqual(contentTypeProp.type.kind, "enum");
  strictEqual(contentTypeProp.type.values.length, 2);
  ok(contentTypeProp.type.values.find((v) => v.value === "application/json"));
  ok(contentTypeProp.type.values.find((v) => v.value === "application/yaml"));

  // uploadMethod
  const uploadMethod = sdkPackage.clients[0].methods.find((m) => m.name === "uploadSpec");
  ok(uploadMethod);
  const uploadMethodParam = uploadMethod.parameters.find((p) => p.name === "spec");
  ok(uploadMethodParam);
  strictEqual(uploadMethodParam.type, specFile);
  const uploadHttpOperation = uploadMethod.operation;
  const uploadBodyParam = uploadHttpOperation.bodyParam;
  ok(uploadBodyParam);
  strictEqual(uploadBodyParam.type, specFile);
  strictEqual(uploadBodyParam.type.serializationOptions.binary?.isFile, true);
  strictEqual(uploadBodyParam.type.serializationOptions.binary?.isText, true);
  deepStrictEqual(uploadBodyParam.type.serializationOptions.binary?.contentTypes, [
    "application/json",
    "application/yaml",
  ]);
  ok(uploadBodyParam.type.serializationOptions.binary?.filename);
  strictEqual(uploadBodyParam.type.serializationOptions.binary?.filename.name, "filename");
  const uploadHeaderParam = uploadHttpOperation.parameters.find(
    (p) => p.serializedName === "x-filename",
  );
  ok(uploadHeaderParam);
  strictEqual(uploadHeaderParam.type.kind, "string");

  // downloadMethod
  const downloadMethod = sdkPackage.clients[0].methods.find((m) => m.name === "downloadSpec");
  ok(downloadMethod);
  const downloadHttpOperation = downloadMethod.operation;
  const downloadResponse = downloadHttpOperation.responses[0];
  ok(downloadResponse);
  strictEqual(downloadResponse.type, specFile);
  strictEqual(downloadResponse.type.serializationOptions.binary?.isFile, true);
  strictEqual(downloadResponse.type.serializationOptions.binary?.isText, true);
  deepStrictEqual(downloadResponse.type.serializationOptions.binary?.contentTypes, [
    "application/json",
    "application/yaml",
  ]);
  ok(downloadResponse.type.serializationOptions.binary?.filename);
  strictEqual(downloadResponse.type.serializationOptions.binary?.filename.name, "filename");
});

it("text file input", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op uploadTextFile(@body file: File<"text/plain", string>): void;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "uploadTextFile");
  const httpOperation = method.operation;
  const bodyParam = httpOperation.bodyParam;
  ok(bodyParam);
  strictEqual(bodyParam.type.kind, "model");
  strictEqual(bodyParam.type.serializationOptions.binary?.isFile, true);
  strictEqual(bodyParam.type.serializationOptions.binary?.isText, true);
  deepStrictEqual(bodyParam.type.serializationOptions.binary?.contentTypes, ["text/plain"]);
  ok(bodyParam.type.serializationOptions.binary?.filename);
  strictEqual(bodyParam.type.serializationOptions.binary?.filename.name, "filename");
});

it("text file output", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op downloadTextFile(): File<"text/plain", string>;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "downloadTextFile");
  const httpOperation = method.operation;
  const responseBody = httpOperation.responses[0];
  ok(responseBody);
  ok(responseBody.type);
  strictEqual(responseBody.type.kind, "model");
  strictEqual(responseBody.type.serializationOptions.binary?.isFile, true);
  strictEqual(responseBody.type.serializationOptions.binary?.isText, true);
  deepStrictEqual(responseBody.type.serializationOptions.binary?.contentTypes, ["text/plain"]);
  ok(responseBody.type.serializationOptions.binary?.filename);
  strictEqual(responseBody.type.serializationOptions.binary?.filename.name, "filename");
});

it("binary file with multiple content types", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op uploadImage(@body file: File<"image/png" | "image/jpeg">): void;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "uploadImage");
  const httpOperation = method.operation;
  const bodyParam = httpOperation.bodyParam;
  ok(bodyParam);
  strictEqual(bodyParam.type.kind, "model");
  strictEqual(bodyParam.type.serializationOptions.binary?.isFile, true);
  strictEqual(bodyParam.type.serializationOptions.binary?.isText, false);
  deepStrictEqual(bodyParam.type.serializationOptions.binary?.contentTypes, [
    "image/png",
    "image/jpeg",
  ]);
  ok(bodyParam.type.serializationOptions.binary?.filename);
  strictEqual(bodyParam.type.serializationOptions.binary?.filename.name, "filename");
});

it("file type headers should have correct serializedName", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op uploadXml(@body file: File<"application/xml">): void;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "uploadXml");
  const httpOperation = method.operation;
  // Find Content-Type header parameter
  const contentTypeParam = httpOperation.parameters.find(
    (p) => p.kind === "header" && p.name === "contentType",
  );
  ok(contentTypeParam);
  // The serializedName should be "Content-Type", not "contentType"
  strictEqual(contentTypeParam.serializedName, "Content-Type");
});

it("file upload with specific content type should have constant contentType", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op uploadFileSpecificContentType(@body file: File<"image/png">): void;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "uploadFileSpecificContentType");
  // The contentType method parameter should be constant, not string
  const contentTypeMethodParam = method.parameters.find((p) => p.name === "contentType");
  ok(contentTypeMethodParam);
  strictEqual(contentTypeMethodParam.type.kind, "constant");
  strictEqual(contentTypeMethodParam.type.value, "image/png");
  // The Content-Type header should also be constant
  const httpOperation = method.operation;
  const contentTypeHeader = httpOperation.parameters.find(
    (p) => p.kind === "header" && p.name === "contentType",
  );
  ok(contentTypeHeader);
  strictEqual(contentTypeHeader.type.kind, "constant");
  strictEqual(contentTypeHeader.type.value, "image/png");
  strictEqual(contentTypeHeader.serializedName, "Content-Type");
});

it("file download with json content type should have correct contentType response header serializedName", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op downloadFileJsonContentType(): File<"application/json", string>;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "downloadFileJsonContentType");
  const httpOperation = method.operation;
  const response = httpOperation.responses[0];
  ok(response);
  ok(response.type);
  // Check that response contentType header has proper serializedName
  const contentTypeHeader = response.headers.find((h) => h.name === "contentType");
  ok(contentTypeHeader);
  strictEqual(contentTypeHeader.serializedName, "Content-Type");
});

it("file download with single content type should have constant accept header", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op downloadFileSingleContentType(): File<"image/png">;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "downloadFileSingleContentType");
  // The accept method parameter should be constant, not string
  const acceptMethodParam = method.parameters.find((p) => p.name === "accept");
  ok(acceptMethodParam);
  strictEqual(acceptMethodParam.type.kind, "constant");
  strictEqual(acceptMethodParam.type.value, "image/png");
  // The Accept header should also be constant
  const httpOperation = method.operation;
  const acceptHeader = httpOperation.parameters.find(
    (p) => p.kind === "header" && p.name === "accept",
  );
  ok(acceptHeader);
  strictEqual(acceptHeader.type.kind, "constant");
  strictEqual(acceptHeader.type.value, "image/png");
  strictEqual(acceptHeader.serializedName, "Accept");
});

it("file download with multiple content types should have enum accept header", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace TestService {
        op downloadFileMultipleContentTypes(): File<"image/png" | "image/jpeg">;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "downloadFileMultipleContentTypes");
  // The accept method parameter should be an enum, not string
  const acceptMethodParam = method.parameters.find((p) => p.name === "accept");
  ok(acceptMethodParam);
  strictEqual(acceptMethodParam.type.kind, "enum");
  strictEqual(acceptMethodParam.type.values.length, 2);
  ok(acceptMethodParam.type.values.find((v) => v.value === "image/png"));
  ok(acceptMethodParam.type.values.find((v) => v.value === "image/jpeg"));
  // The Accept header should also be an enum
  const httpOperation = method.operation;
  const acceptHeader = httpOperation.parameters.find(
    (p) => p.kind === "header" && p.name === "accept",
  );
  ok(acceptHeader);
  strictEqual(acceptHeader.type.kind, "enum");
  strictEqual(acceptHeader.serializedName, "Accept");
});
