import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-java",
    "examples-dir": `./examples`,
  });
});

describe("String to number/boolean example conversion", () => {
  it("should accept string values for number types", async () => {
    await runner.host.addTypeSpecFile(
      "./examples/string-to-number.json",
      JSON.stringify({
        operationId: "stringToNumber",
        title: "String to number conversion test",
        parameters: {
          intParam: "123",
          floatParam: "123.45",
          negativeParam: "-456"
        },
        responses: {}
      })
    );

    await runner.compile(`
      @service
      namespace TestClient {
        op stringToNumber(
          @query intParam: int32,
          @query floatParam: float64,
          @query negativeParam: int32
        ): void;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].kind, "http");

    const parameters = operation.examples[0].parameters;
    ok(parameters);
    strictEqual(parameters.length, 3);

    // Check that string "123" was converted to number 123
    strictEqual(parameters[0].value.kind, "number");
    strictEqual(parameters[0].value.value, 123);
    strictEqual(parameters[0].value.type.kind, "int32");

    // Check that string "123.45" was converted to number 123.45
    strictEqual(parameters[1].value.kind, "number");
    strictEqual(parameters[1].value.value, 123.45);
    strictEqual(parameters[1].value.type.kind, "float64");

    // Check that string "-456" was converted to number -456
    strictEqual(parameters[2].value.kind, "number");
    strictEqual(parameters[2].value.value, -456);
    strictEqual(parameters[2].value.type.kind, "int32");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("should accept string values for boolean types", async () => {
    await runner.host.addTypeSpecFile(
      "./examples/string-to-boolean.json",
      JSON.stringify({
        operationId: "stringToBoolean",
        title: "String to boolean conversion test",
        parameters: {
          trueParam: "true",
          falseParam: "false",
          upperTrueParam: "TRUE",
          upperFalseParam: "FALSE"
        },
        responses: {}
      })
    );

    await runner.compile(`
      @service
      namespace TestClient {
        op stringToBoolean(
          @query trueParam: boolean,
          @query falseParam: boolean,
          @query upperTrueParam: boolean,
          @query upperFalseParam: boolean
        ): void;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].kind, "http");

    const parameters = operation.examples[0].parameters;
    ok(parameters);
    strictEqual(parameters.length, 4);

    // Check that string "true" was converted to boolean true
    strictEqual(parameters[0].value.kind, "boolean");
    strictEqual(parameters[0].value.value, true);
    strictEqual(parameters[0].value.type.kind, "boolean");

    // Check that string "false" was converted to boolean false
    strictEqual(parameters[1].value.kind, "boolean");
    strictEqual(parameters[1].value.value, false);
    strictEqual(parameters[1].value.type.kind, "boolean");

    // Check that string "TRUE" was converted to boolean true
    strictEqual(parameters[2].value.kind, "boolean");
    strictEqual(parameters[2].value.value, true);
    strictEqual(parameters[2].value.type.kind, "boolean");

    // Check that string "FALSE" was converted to boolean false
    strictEqual(parameters[3].value.kind, "boolean");
    strictEqual(parameters[3].value.value, false);
    strictEqual(parameters[3].value.type.kind, "boolean");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("should reject invalid string values for number types", async () => {
    await runner.host.addTypeSpecFile(
      "./examples/invalid-string-to-number.json",
      JSON.stringify({
        operationId: "invalidStringToNumber",
        title: "Invalid string to number test",
        parameters: {
          invalidParam: "abc"
        },
        responses: {}
      })
    );

    await runner.compile(`
      @service
      namespace TestClient {
        op invalidStringToNumber(
          @query invalidParam: int32
        ): void;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].kind, "http");

    const parameters = operation.examples[0].parameters;
    ok(parameters);
    strictEqual(parameters.length, 0); // Should be 0 because conversion failed

    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'invalid-string-to-number.json' does not follow its definition:\n"abc"`,
    });
  });

  it("should reject invalid string values for boolean types", async () => {
    await runner.host.addTypeSpecFile(
      "./examples/invalid-string-to-boolean.json",
      JSON.stringify({
        operationId: "invalidStringToBoolean",
        title: "Invalid string to boolean test",
        parameters: {
          invalidParam: "yes"
        },
        responses: {}
      })
    );

    await runner.compile(`
      @service
      namespace TestClient {
        op invalidStringToBoolean(
          @query invalidParam: boolean
        ): void;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].kind, "http");

    const parameters = operation.examples[0].parameters;
    ok(parameters);
    strictEqual(parameters.length, 0); // Should be 0 because conversion failed

    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'invalid-string-to-boolean.json' does not follow its definition:\n"yes"`,
    });
  });
});