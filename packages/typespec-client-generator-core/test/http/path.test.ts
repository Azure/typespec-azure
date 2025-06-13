import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "../utils.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("optional path parameter", async () => {
  await runner.compileWithBuiltInService(`
    op myOp(@path path?: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;
  strictEqual(serviceOperation.path, "{path}");
  strictEqual(serviceOperation.uriTemplate, "{/path}");

  strictEqual(serviceOperation.parameters.length, 1);
  const pathParam = serviceOperation.parameters[0];

  strictEqual(pathParam.kind, "path");
  strictEqual(pathParam.serializedName, "path");
  strictEqual(pathParam.name, "path");
  strictEqual(pathParam.optional, true);
  strictEqual(pathParam.onClient, false);
  strictEqual(pathParam.isApiVersionParam, false);
  strictEqual(pathParam.type.kind, "string");
  strictEqual(pathParam.allowReserved, false);
});

it("required path parameter", async () => {
  await runner.compileWithBuiltInService(`
    op myOp(@path path: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;
  strictEqual(serviceOperation.path, "/{path}");
  strictEqual(serviceOperation.uriTemplate, "/{path}");

  strictEqual(serviceOperation.parameters.length, 1);
  const pathParam = serviceOperation.parameters[0];

  strictEqual(pathParam.kind, "path");
  strictEqual(pathParam.serializedName, "path");
  strictEqual(pathParam.name, "path");
  strictEqual(pathParam.optional, false);
  strictEqual(pathParam.onClient, false);
  strictEqual(pathParam.isApiVersionParam, false);
  strictEqual(pathParam.type.kind, "string");
  strictEqual(pathParam.allowReserved, false);
});
