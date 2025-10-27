import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("basic file input", async () => {
  await runner.compile(
    `
      @service
      namespace TestService {
        op uploadFile(@body file: File): void;
      }
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "uploadFile");
  const fileMethodParam = method.parameters.find((p) => p.name === "file");
  ok(fileMethodParam);
  strictEqual(fileMethodParam.type.kind, "model");
  const httpOperation = method.operation;
  const bodyParam = httpOperation.bodyParam;
  ok(bodyParam);
  strictEqual(bodyParam.type.kind, "model");
  strictEqual(bodyParam.serializationOptions.binary?.isFile, true);
  const fileModel = runner.context.sdkPackage.models.find((m) => m.name === "File");
  ok(fileModel);
  strictEqual(fileModel.properties.length, 3);
  const contentType = fileModel.properties.find((p) => p.name === "contentType")!;
  strictEqual(contentType.type.kind, "string");
  ok(fileModel.properties.find((p) => p.name === "contents"));
  ok(fileModel.properties.find((p) => p.name === "filename"));
});

it("file input with content type", async () => {
  await runner.compile(
    `
      @service
      namespace TestService {
        op uploadFile(@body file: File<"application/yaml">): void;
      }
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.name, "uploadFile");
  const fileMethodParam = method.parameters.find((p) => p.name === "file");
  ok(fileMethodParam);
  strictEqual(fileMethodParam.type.kind, "model");
  const httpOperation = method.operation;
  const bodyParam = httpOperation.bodyParam;
  ok(bodyParam);
  strictEqual(bodyParam.type.kind, "model");
  strictEqual(bodyParam.serializationOptions.binary?.isFile, true);
  const fileModel = bodyParam.type;
  const contentType = fileModel.properties.find((p) => p.name === "contentType")!;
  strictEqual(contentType.type.kind, "constant");
  strictEqual(contentType.type.value, "application/yaml");
});

it("basic file output", async () => {
  await runner.compile(
    `
      @service
      namespace TestService {
        op downloadFile(): File;
      }
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
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
  strictEqual(responseBody.serializationOptions.binary?.isFile, true);
});
