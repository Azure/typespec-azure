import { ok, strictEqual } from "assert";
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
});
