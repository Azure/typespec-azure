import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "../utils.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("optional body parameter", async () => {
  await runner.compileWithBuiltInService(`
    op myOp(@body body?: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;
  const bodyParam = serviceOperation.bodyParam;
  ok(bodyParam);

  strictEqual(bodyParam.kind, "body");
  strictEqual(bodyParam.serializedName, "body");
  strictEqual(bodyParam.name, "body");
  strictEqual(bodyParam.optional, true);
  strictEqual(bodyParam.onClient, false);
  strictEqual(bodyParam.isApiVersionParam, false);
  strictEqual(bodyParam.type.kind, "string");
});

it("required body parameter", async () => {
  await runner.compileWithBuiltInService(`
    op myOp(@body body: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;
  const bodyParam = serviceOperation.bodyParam;
  ok(bodyParam);

  strictEqual(bodyParam.kind, "body");
  strictEqual(bodyParam.serializedName, "body");
  strictEqual(bodyParam.name, "body");
  strictEqual(bodyParam.optional, false);
  strictEqual(bodyParam.onClient, false);
  strictEqual(bodyParam.isApiVersionParam, false);
  strictEqual(bodyParam.type.kind, "string");
});

it("spread body always required", async () => {
  await runner.compileWithBuiltInService(`
    op myOp(foo?: string, bar?: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;
  const bodyParam = serviceOperation.bodyParam;
  ok(bodyParam);

  strictEqual(bodyParam.kind, "body");
  strictEqual(bodyParam.serializedName, "");
  strictEqual(bodyParam.name, "myOpRequest");
  strictEqual(bodyParam.optional, false);
  strictEqual(bodyParam.onClient, false);
  strictEqual(bodyParam.isApiVersionParam, false);
  strictEqual(bodyParam.type.kind, "model");
});
