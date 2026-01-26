import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTesterWithService } from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

it("optional body parameter", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    op myOp(@body body?: string): void;
    `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithService.compile(`
    op myOp(@body body: string): void;
    `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithService.compile(`
    op myOp(foo?: string, bar?: string): void;
    `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
