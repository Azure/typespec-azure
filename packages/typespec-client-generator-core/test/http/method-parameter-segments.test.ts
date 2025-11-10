import { strictEqual, ok } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "../utils.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("simple path parameter - direct mapping", async () => {
  await runner.compileWithBuiltInService(`
    op myOp(@path path: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;

  strictEqual(serviceOperation.parameters.length, 1);
  const pathParam = serviceOperation.parameters[0];

  // Check correspondingMethodParams (deprecated but still populated)
  strictEqual(pathParam.correspondingMethodParams.length, 1);
  strictEqual(pathParam.correspondingMethodParams[0].name, "path");

  // Check new methodParameterSegments
  strictEqual(pathParam.methodParameterSegments.length, 1);
  strictEqual(pathParam.methodParameterSegments[0].length, 1);
  strictEqual(pathParam.methodParameterSegments[0][0].name, "path");
  strictEqual(pathParam.methodParameterSegments[0][0].kind, "method");
});

it("query parameter - direct mapping", async () => {
  await runner.compileWithBuiltInService(`
    op myOp(@query q: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;

  strictEqual(serviceOperation.parameters.length, 1);
  const queryParam = serviceOperation.parameters[0];

  // Check correspondingMethodParams (deprecated but still populated)
  strictEqual(queryParam.correspondingMethodParams.length, 1);
  strictEqual(queryParam.correspondingMethodParams[0].name, "q");

  // Check new methodParameterSegments
  strictEqual(queryParam.methodParameterSegments.length, 1);
  strictEqual(queryParam.methodParameterSegments[0].length, 1);
  strictEqual(queryParam.methodParameterSegments[0][0].name, "q");
  strictEqual(queryParam.methodParameterSegments[0][0].kind, "method");
});

it("header parameter - direct mapping", async () => {
  await runner.compileWithBuiltInService(`
    op myOp(@header h: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;

  strictEqual(serviceOperation.parameters.length, 1);
  const headerParam = serviceOperation.parameters[0];

  // Check correspondingMethodParams (deprecated but still populated)
  strictEqual(headerParam.correspondingMethodParams.length, 1);
  strictEqual(headerParam.correspondingMethodParams[0].name, "h");

  // Check new methodParameterSegments
  strictEqual(headerParam.methodParameterSegments.length, 1);
  strictEqual(headerParam.methodParameterSegments[0].length, 1);
  strictEqual(headerParam.methodParameterSegments[0][0].name, "h");
  strictEqual(headerParam.methodParameterSegments[0][0].kind, "method");
});

it("body parameter - direct mapping", async () => {
  await runner.compileWithBuiltInService(`
    op myOp(@body body: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;

  ok(serviceOperation.bodyParam);
  
  // Check correspondingMethodParams (deprecated but still populated)
  strictEqual(serviceOperation.bodyParam.correspondingMethodParams.length, 1);
  strictEqual(serviceOperation.bodyParam.correspondingMethodParams[0].name, "body");

  // Check new methodParameterSegments
  strictEqual(serviceOperation.bodyParam.methodParameterSegments.length, 1);
  strictEqual(serviceOperation.bodyParam.methodParameterSegments[0].length, 1);
  strictEqual(serviceOperation.bodyParam.methodParameterSegments[0][0].name, "body");
  strictEqual(serviceOperation.bodyParam.methodParameterSegments[0][0].kind, "method");
});

it("nested property path - property access", async () => {
  await runner.compileWithBuiltInService(`
    model Input {
      @query q: string;
    }
    op myOp(input: Input): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;

  strictEqual(serviceOperation.parameters.length, 1);
  const queryParam = serviceOperation.parameters[0];

  // Check correspondingMethodParams returns the final property
  strictEqual(queryParam.correspondingMethodParams.length, 1);
  strictEqual(queryParam.correspondingMethodParams[0].name, "q");

  // Check new methodParameterSegments shows complete path
  strictEqual(queryParam.methodParameterSegments.length, 1);
  strictEqual(queryParam.methodParameterSegments[0].length, 2);
  strictEqual(queryParam.methodParameterSegments[0][0].name, "input");
  strictEqual(queryParam.methodParameterSegments[0][0].kind, "method");
  strictEqual(queryParam.methodParameterSegments[0][1].name, "q");
  strictEqual(queryParam.methodParameterSegments[0][1].kind, "property");
});

it("spread body - multiple paths", async () => {
  await runner.compileWithBuiltInService(`
    model Input {
      key1: string;
      key2: string;
    }
    op myOp(...Input): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;

  ok(serviceOperation.bodyParam);
  
  // Check correspondingMethodParams returns multiple final properties
  strictEqual(serviceOperation.bodyParam.correspondingMethodParams.length, 2);

  // Check new methodParameterSegments has multiple paths (one per spread property)
  strictEqual(serviceOperation.bodyParam.methodParameterSegments.length, 2);
  
  // First path should be to key1
  strictEqual(serviceOperation.bodyParam.methodParameterSegments[0].length, 1);
  strictEqual(serviceOperation.bodyParam.methodParameterSegments[0][0].name, "key1");
  strictEqual(serviceOperation.bodyParam.methodParameterSegments[0][0].kind, "method");
  
  // Second path should be to key2
  strictEqual(serviceOperation.bodyParam.methodParameterSegments[1].length, 1);
  strictEqual(serviceOperation.bodyParam.methodParameterSegments[1][0].name, "key2");
  strictEqual(serviceOperation.bodyParam.methodParameterSegments[1][0].kind, "method");
});

it("deeply nested property path", async () => {
  await runner.compileWithBuiltInService(`
    model Level2 {
      @query q: string;
    }
    model Level1 {
      level2: Level2;
    }
    op myOp(input: Level1): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const serviceOperation = method.operation;

  strictEqual(serviceOperation.parameters.length, 1);
  const queryParam = serviceOperation.parameters[0];

  // Check correspondingMethodParams returns only the final property
  strictEqual(queryParam.correspondingMethodParams.length, 1);
  strictEqual(queryParam.correspondingMethodParams[0].name, "q");

  // Check new methodParameterSegments shows complete path through all levels
  strictEqual(queryParam.methodParameterSegments.length, 1);
  strictEqual(queryParam.methodParameterSegments[0].length, 3);
  strictEqual(queryParam.methodParameterSegments[0][0].name, "input");
  strictEqual(queryParam.methodParameterSegments[0][0].kind, "method");
  strictEqual(queryParam.methodParameterSegments[0][1].name, "level2");
  strictEqual(queryParam.methodParameterSegments[0][1].kind, "property");
  strictEqual(queryParam.methodParameterSegments[0][2].name, "q");
  strictEqual(queryParam.methodParameterSegments[0][2].kind, "property");
});
