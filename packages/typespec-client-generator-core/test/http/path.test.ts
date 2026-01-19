import { strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTesterWithBuiltInService } from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

it("optional path parameter", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    op myOp(@path path?: string): void;
    `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    op myOp(@path path: string): void;
    `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
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
