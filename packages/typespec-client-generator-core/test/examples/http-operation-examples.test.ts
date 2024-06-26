import { expectDiagnostics, resolveVirtualPath } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: http operation examples", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-java",
      "examples-directory": `./examples`,
    });
  });

  it("simple case", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/simple.json",
      `${__dirname}/http-operation-examples/simple.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op simple(): void;
      }
    `);

    const operation = (
      runner.context.experimental_sdkPackage.clients[0]
        .methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].kind, "http");
    strictEqual(operation.examples[0].name, "simple description");
    strictEqual(operation.examples[0].description, "simple description");
    strictEqual(operation.examples[0].filePath, resolveVirtualPath("./examples/simple.json"));
    deepStrictEqual(operation.examples[0].rawExample, {
      operationId: "simple",
      title: "simple description",
      parameters: {},
      responses: {},
    });

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("parameters", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/parameters.json",
      `${__dirname}/http-operation-examples/parameters.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        @route("/{b}")
        op parameters(
          @header a: string,
          @path b: string,
          @query c: string,
          @body d: string,
        ): void;
      }
    `);

    const operation = (
      runner.context.experimental_sdkPackage.clients[0]
        .methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].kind, "http");

    const parameters = operation.examples[0].parameters;
    ok(parameters);
    strictEqual(parameters.length, 4);

    strictEqual(parameters[0].value.kind, "string");
    strictEqual(parameters[0].value.value, "header");
    strictEqual(parameters[0].value.type.kind, "string");

    strictEqual(parameters[1].value.kind, "string");
    strictEqual(parameters[1].value.value, "path");
    strictEqual(parameters[1].value.type.kind, "string");

    strictEqual(parameters[2].value.kind, "string");
    strictEqual(parameters[2].value.value, "query");
    strictEqual(parameters[2].value.type.kind, "string");

    strictEqual(parameters[3].value.kind, "string");
    strictEqual(parameters[3].value.value, "body");
    strictEqual(parameters[3].value.type.kind, "string");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("parameters diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/parametersDiagnostic.json",
      `${__dirname}/http-operation-examples/parametersDiagnostic.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        @route("/{b}")
        op parametersDiagnostic(
          @header a: string,
          @path b: string,
          @query c: string,
          @body d: string,
        ): void;
      }
    `);

    const operation = (
      runner.context.experimental_sdkPackage.clients[0]
        .methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].kind, "http");

    const parameters = operation.examples[0].parameters;
    ok(parameters);
    strictEqual(parameters.length, 0);

    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'parametersDiagnostic.json' does not follow its definition:\n{"test":"a"}`,
    });
  });

  it("responses", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/responses.json",
      `${__dirname}/http-operation-examples/responses.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op responses(): {
          @statusCode
          code: 200,
          @body
          body: string
        } | {
          @statusCode
          code: 201,
          @header
          test: string
        };
      }
    `);

    const operation = (
      runner.context.experimental_sdkPackage.clients[0]
        .methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].kind, "http");

    const okResponse = operation.examples[0].responses.get(200);
    ok(okResponse);
    deepStrictEqual(okResponse.response, operation.responses.get(200));
    ok(okResponse.value);

    strictEqual(okResponse.value.kind, "string");
    strictEqual(okResponse.value.value, "test");
    strictEqual(okResponse.value.type.kind, "string");

    const createdResponse = operation.examples[0].responses.get(201);
    ok(createdResponse);
    deepStrictEqual(createdResponse.response, operation.responses.get(201));

    strictEqual(createdResponse.value, undefined);
    strictEqual(createdResponse.headers.length, 1);

    deepStrictEqual(createdResponse.headers[0].header, operation.responses.get(201)?.headers[0]);
    strictEqual(createdResponse.headers[0].value.value, "test");
    strictEqual(createdResponse.headers[0].value.kind, "string");
    strictEqual(createdResponse.headers[0].value.type.kind, "string");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("responses diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/responsesDiagnostic.json",
      `${__dirname}/http-operation-examples/responsesDiagnostic.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op responsesDiagnostic(): {
          @statusCode
          code: 200,
          @body
          body: string
        } | {
          @statusCode
          code: 201,
          @header
          test: string
        };
      }
    `);

    const operation = (
      runner.context.experimental_sdkPackage.clients[0]
        .methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].kind, "http");

    strictEqual(operation.examples[0].responses.size, 1);
    const createdResponse = operation.examples[0].responses.get(201);
    ok(createdResponse);
    deepStrictEqual(createdResponse.response, operation.responses.get(201));

    strictEqual(createdResponse.value, undefined);
    strictEqual(createdResponse.headers.length, 0);

    expectDiagnostics(runner.context.diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
        message: `Value in example file 'responsesDiagnostic.json' does not follow its definition:\n{"a":"test"}`,
      },
      {
        code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
        message: `Value in example file 'responsesDiagnostic.json' does not follow its definition:\n{"body":"test"}`,
      },
      {
        code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
        message: `Value in example file 'responsesDiagnostic.json' does not follow its definition:\n{"test":1}`,
      },
      {
        code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
        message: `Value in example file 'responsesDiagnostic.json' does not follow its definition:\n{"203":{"headers":{},"body":"test"}}`,
      },
    ]);
  });
});
