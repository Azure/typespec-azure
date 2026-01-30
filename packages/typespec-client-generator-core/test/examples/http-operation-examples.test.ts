import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

it("simple case", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/simple.json",
    `${__dirname}/http-operation-examples/simple.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op simple(): void;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples[0].kind, "http");
  strictEqual(operation.examples[0].name, "simple description");
  strictEqual(operation.examples[0].doc, "simple description");
  strictEqual(operation.examples[0].filePath, "simple.json");
  deepStrictEqual(operation.examples[0].rawExample, {
    operationId: "simple",
    title: "simple description",
    parameters: {},
    responses: {},
  });

  expectDiagnostics(context.diagnostics, []);
});

it("parameters", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/parameters.json",
    `${__dirname}/http-operation-examples/parameters.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      @route("/{b}")
      op parameters(
        @header a: string,
        @path b: string,
        @query c: string,
        @body d: string,
        @header testHeader: string,
        @clientName("renameQuery")
        @query testQuery: string,
        @path("renamePath") testPath: string,
      ): void;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples[0].kind, "http");

  const parameters = operation.examples[0].parameters;
  ok(parameters);
  strictEqual(parameters.length, 7);

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

  strictEqual(parameters[4].value.kind, "string");
  strictEqual(parameters[4].value.value, "test-header");
  strictEqual(parameters[4].value.type.kind, "string");

  strictEqual(parameters[5].value.kind, "string");
  strictEqual(parameters[5].value.value, "testQuery");
  strictEqual(parameters[5].value.type.kind, "string");

  strictEqual(parameters[6].value.kind, "string");
  strictEqual(parameters[6].value.value, "renamePath");
  strictEqual(parameters[6].value.type.kind, "string");

  expectDiagnostics(context.diagnostics, []);
});

it("body with encoded name", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/bodyWithEncodedName.json",
    `${__dirname}/http-operation-examples/bodyWithEncodedName.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op encodedname(
        @body @encodedName("application/json", "b") body: string,
      ): void;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples[0].kind, "http");

  const parameters = operation.examples[0].parameters;
  ok(parameters);
  strictEqual(parameters.length, 1);

  strictEqual(parameters[0].value.kind, "string");
  strictEqual(parameters[0].value.value, "body");
  strictEqual(parameters[0].value.type.kind, "string");

  expectDiagnostics(context.diagnostics, []);
});

it("body fallback", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/parameters.json",
    `${__dirname}/http-operation-examples/bodyFallback.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op bodyTest(prop: string): void;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples[0].kind, "http");

  const parameters = operation.examples[0].parameters;
  ok(parameters);
  strictEqual(parameters.length, 1);

  strictEqual(parameters[0].value.kind, "model");
  strictEqual(parameters[0].value.value["prop"].kind, "string");
  strictEqual(parameters[0].value.value["prop"].value, "body");
  strictEqual(parameters[0].value.type.kind, "model");

  expectDiagnostics(context.diagnostics, []);
});

it("body fallback client name", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/parameters.json",
    `${__dirname}/http-operation-examples/bodyFallbackClientName.json`,
  );
  const { program } = await instance.compile(`
    @service
    namespace TestClient {
      op bodyTest(@body @clientName("test") prop: string): void;
    }
  `);
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples[0].kind, "http");

  const parameters = operation.examples[0].parameters;
  ok(parameters);
  strictEqual(parameters.length, 1);

  strictEqual(parameters[0].value.kind, "string");
  strictEqual(parameters[0].value.value, "body");
  strictEqual(parameters[0].value.type.kind, "string");

  expectDiagnostics(context.diagnostics, []);
});

it("parameters diagnostic", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/parametersDiagnostic.json",
    `${__dirname}/http-operation-examples/parametersDiagnostic.json`,
  );
  const { program } = await instance.compile(`
    @service
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
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples[0].kind, "http");

  const parameters = operation.examples[0].parameters;
  ok(parameters);
  strictEqual(parameters.length, 0);

  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'parametersDiagnostic.json' does not follow its definition:\n{"test":"a"}`,
  });
});

it("responses", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/responses.json",
    `${__dirname}/http-operation-examples/responses.json`,
  );
  const { program } = await instance.compile(`
    @service
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
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples[0].kind, "http");

  const okResponse = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(okResponse);
  deepStrictEqual(
    okResponse.response,
    operation.responses.find((x) => x.statusCodes === 200),
  );
  ok(okResponse.bodyValue);

  strictEqual(okResponse.bodyValue.kind, "string");
  strictEqual(okResponse.bodyValue.value, "test");
  strictEqual(okResponse.bodyValue.type.kind, "string");

  const createdResponse = operation.examples[0].responses.find((x) => x.statusCode === 201);
  ok(createdResponse);
  deepStrictEqual(
    createdResponse.response,
    operation.responses.find((x) => x.statusCodes === 201),
  );

  strictEqual(createdResponse.bodyValue, undefined);
  strictEqual(createdResponse.headers.length, 1);

  deepStrictEqual(
    createdResponse.headers[0].header,
    operation.responses.find((x) => x.statusCodes === 201)?.headers[0],
  );
  strictEqual(createdResponse.headers[0].value.value, "test");
  strictEqual(createdResponse.headers[0].value.kind, "string");
  strictEqual(createdResponse.headers[0].value.type.kind, "string");

  expectDiagnostics(context.diagnostics, []);
});

it("responses diagnostic", async () => {
  const instance = await SimpleTester.createInstance();
  await instance.fs.addRealTypeSpecFile(
    "./examples/responsesDiagnostic.json",
    `${__dirname}/http-operation-examples/responsesDiagnostic.json`,
  );
  const { program } = await instance.compile(`
    @service
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
  const context = await createSdkContextForTester(program);

  const operation = (context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>)
    .operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  strictEqual(operation.examples[0].kind, "http");

  strictEqual(operation.examples[0].responses.length, 1);
  const createdResponse = operation.examples[0].responses.find((x) => x.statusCode === 201);
  ok(createdResponse);
  deepStrictEqual(
    createdResponse.response,
    operation.responses.find((x) => x.statusCodes === 201),
  );

  strictEqual(createdResponse.bodyValue, undefined);
  strictEqual(createdResponse.headers.length, 0);

  expectDiagnostics(context.diagnostics, [
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
