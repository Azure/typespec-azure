import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-java",
    "examples-dir": `./examples`,
  });
});

it("SdkStringExample", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getString.json",
    `${__dirname}/example-types/getString.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getString(): string;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "string");
  strictEqual(response.bodyValue?.value, "test");
  strictEqual(response.bodyValue?.type.kind, "string");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkStringExample diagnostic", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringDiagnostic.json",
    `${__dirname}/example-types/getStringDiagnostic.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getStringDiagnostic(): string;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue, undefined);
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getStringDiagnostic.json' does not follow its definition:\n123`,
  });
});

it("SdkStringExample from constant", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringFromConstant.json",
    `${__dirname}/example-types/getStringFromConstant.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getStringFromConstant(): "test";
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "string");
  strictEqual(response.bodyValue?.value, "test");
  strictEqual(response.bodyValue?.type.kind, "constant");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkStringExample from constant diagnostic", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringFromConstantDiagnostic.json",
    `${__dirname}/example-types/getStringFromConstantDiagnostic.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getStringFromConstantDiagnostic(): "test";
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue, undefined);
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getStringFromConstantDiagnostic.json' does not follow its definition:\n123`,
  });
});

it("SdkStringExample from enum", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringFromEnum.json",
    `${__dirname}/example-types/getStringFromEnum.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      enum TestEnum {
          one,two,three
      }
      op getStringFromEnum(): TestEnum;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "string");
  strictEqual(response.bodyValue?.value, "one");
  strictEqual(response.bodyValue?.type.kind, "enum");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkStringExample from extensible enum", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringFromExtensibleEnum.json",
    `${__dirname}/example-types/getStringFromExtensibleEnum.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      union TestEnum {
          "one","two","three",string
      }
      op getStringFromExtensibleEnum(): {@body body: TestEnum};
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "string");
  strictEqual(response.bodyValue?.value, "four");
  strictEqual(response.bodyValue?.type.kind, "enum");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkStringExample from enum diagnostic", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringFromEnumDiagnostic.json",
    `${__dirname}/example-types/getStringFromEnumDiagnostic.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      enum TestEnum {
          one,two,three
      }
      op getStringFromEnumDiagnostic(): TestEnum;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue, undefined);
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getStringFromEnumDiagnostic.json' does not follow its definition:\n"four"`,
  });
});

it("SdkStringExample from enum value", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringFromEnumValue.json",
    `${__dirname}/example-types/getStringFromEnumValue.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      enum TestEnum {
          one,two,three
      }
      op getStringFromEnumValue(): TestEnum.one;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "string");
  strictEqual(response.bodyValue?.value, "one");
  strictEqual(response.bodyValue?.type.kind, "enumvalue");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkStringExample from enum value diagnostic", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringFromEnumValueDiagnostic.json",
    `${__dirname}/example-types/getStringFromEnumValueDiagnostic.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      enum TestEnum {
          one,two,three
      }
      op getStringFromEnumValueDiagnostic(): TestEnum.one;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue, undefined);
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getStringFromEnumValueDiagnostic.json' does not follow its definition:\n"four"`,
  });
});

it("SdkStringExample from datetime", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringFromDataTime.json",
    `${__dirname}/example-types/getStringFromDataTime.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getStringFromDataTime(): utcDateTime;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "string");
  strictEqual(response.bodyValue?.value, "2022-08-26T18:38:00.000Z");
  strictEqual(response.bodyValue?.type.kind, "utcDateTime");
  strictEqual(response.bodyValue?.type.wireType.kind, "string");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkStringExample from duration", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getStringFromDuration.json",
    `${__dirname}/example-types/getStringFromDuration.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getStringFromDuration(): duration;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response?.bodyValue?.kind, "string");
  strictEqual(response?.bodyValue?.value, "P40D");
  strictEqual(response?.bodyValue?.type.kind, "duration");
  strictEqual(response.bodyValue?.type.wireType.kind, "string");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkNumberExample", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getNumber.json",
    `${__dirname}/example-types/getNumber.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getNumber(): float32;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "number");
  strictEqual(response.bodyValue?.value, 31.752);
  strictEqual(response.bodyValue?.type.kind, "float32");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkNumberExample with string conversion", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getNumberDiagnostic.json",
    `${__dirname}/example-types/getNumberDiagnostic.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getNumberDiagnostic(): float32;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  ok(response.bodyValue);
  strictEqual(response.bodyValue.kind, "number");
  strictEqual(response.bodyValue.value, 123);
  strictEqual(response.bodyValue.type.kind, "float32");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkNumberExample invalid string diagnostic", async () => {
  await runner.host.addTypeSpecFile(
    "./examples/getNumberInvalidDiagnostic.json",
    JSON.stringify({
      operationId: "getNumberInvalidDiagnostic",
      title: "getNumberInvalidDiagnostic",
      parameters: {},
      responses: {
        "200": {
          body: "invalid"
        }
      }
    })
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getNumberInvalidDiagnostic(): float32;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue, undefined);
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getNumberInvalidDiagnostic.json' does not follow its definition:\n"invalid"`,
  });
});

it("SdkNumberExample from datetime", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getNumberFromDateTime.json",
    `${__dirname}/example-types/getNumberFromDateTime.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      @encode(DateTimeKnownEncoding.unixTimestamp, int64)
      scalar timestamp extends utcDateTime;

      op getNumberFromDateTime(): timestamp;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "number");
  strictEqual(response.bodyValue?.value, 1686566864);
  strictEqual(response.bodyValue?.type.kind, "utcDateTime");
  strictEqual(response.bodyValue?.type.wireType.kind, "int64");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkNumberExample from duration", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getNumberFromDuration.json",
    `${__dirname}/example-types/getNumberFromDuration.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      @encode(DurationKnownEncoding.seconds, float)
      scalar delta extends duration;

      op getNumberFromDuration(): delta;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "number");
  strictEqual(response.bodyValue?.value, 62.525);
  strictEqual(response.bodyValue?.type.kind, "duration");
  strictEqual(response.bodyValue?.type.wireType.kind, "float");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkBooleanExample", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getBoolean.json",
    `${__dirname}/example-types/getBoolean.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getBoolean(): boolean;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "boolean");
  strictEqual(response.bodyValue?.value, true);
  strictEqual(response.bodyValue?.type.kind, "boolean");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkBooleanExample diagnostic", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getBooleanDiagnostic.json",
    `${__dirname}/example-types/getBooleanDiagnostic.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getBooleanDiagnostic(): boolean;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue, undefined);
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getBooleanDiagnostic.json' does not follow its definition:\n123`,
  });
});

it("SdkNullExample", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getNull.json",
    `${__dirname}/example-types/getNull.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getNull(): {@body body: string | null};
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "null");
  strictEqual(response.bodyValue?.value, null);
  strictEqual(response.bodyValue?.type.kind, "nullable");
  strictEqual(response.bodyValue?.type.type.kind, "string");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkAnyExample", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getAny.json",
    `${__dirname}/example-types/getAny.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getAny(): unknown;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "unknown");
  deepStrictEqual(response.bodyValue?.value, { test: 123 });

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkUnionExample", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getUnion.json",
    `${__dirname}/example-types/getUnion.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getUnion(): {@body body: string | int32};
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "union");
  strictEqual(response.bodyValue?.value, "test");
  strictEqual(response.bodyValue?.type.kind, "union");
});

it("SdkArrayExample", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getArray.json",
    `${__dirname}/example-types/getArray.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getArray(): string[];
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue?.kind, "array");
  strictEqual(response.bodyValue.value.length, 3);
  strictEqual(response.bodyValue.type.kind, "array");
  strictEqual(response.bodyValue.type.valueType.kind, "string");
  strictEqual(response.bodyValue.value[0].value, "a");
  strictEqual(response.bodyValue.value[0].kind, "string");
  strictEqual(response.bodyValue.value[0].type.kind, "string");
  strictEqual(response.bodyValue.value[1].value, "b");
  strictEqual(response.bodyValue.value[1].kind, "string");
  strictEqual(response.bodyValue.value[1].type.kind, "string");
  strictEqual(response.bodyValue.value[2].value, "c");
  strictEqual(response.bodyValue.value[2].kind, "string");
  strictEqual(response.bodyValue.value[2].type.kind, "string");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkArrayExample diagnostic", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getArrayDiagnostic.json",
    `${__dirname}/example-types/getArrayDiagnostic.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getArrayDiagnostic(): string[];
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue, undefined);
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getArrayDiagnostic.json' does not follow its definition:\n"test"`,
  });
});

it("SdkDictionaryExample", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getDictionary.json",
    `${__dirname}/example-types/getDictionary.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getDictionary(): Record<string>;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "dict");
  strictEqual(Object.keys(bodyValue.value).length, 3);
  strictEqual(bodyValue.value["a"].value, "a");
  strictEqual(bodyValue.value["a"].kind, "string");
  strictEqual(bodyValue.value["a"].type.kind, "string");
  strictEqual(bodyValue.value["b"].value, "b");
  strictEqual(bodyValue.value["b"].kind, "string");
  strictEqual(bodyValue.value["b"].type.kind, "string");
  strictEqual(bodyValue.value["c"].value, "c");
  strictEqual(bodyValue.value["c"].kind, "string");
  strictEqual(bodyValue.value["c"].type.kind, "string");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkDictionaryExample diagnostic", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getDictionaryDiagnostic.json",
    `${__dirname}/example-types/getDictionaryDiagnostic.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      op getDictionaryDiagnostic(): Record<string>;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  strictEqual(response.bodyValue, undefined);
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getDictionaryDiagnostic.json' does not follow its definition:\n"test"`,
  });
});

it("SdkModelExample", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModel.json",
    `${__dirname}/example-types/getModel.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        a: string;
        b: int32;
        @clientName("renamedProp")
        prop: string;
        nullProp?: {};
      }

      op getModel(): Test;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Test");
  strictEqual(Object.keys(bodyValue.value).length, 3);
  strictEqual(bodyValue.value["a"].value, "a");
  strictEqual(bodyValue.value["a"].kind, "string");
  strictEqual(bodyValue.value["a"].type.kind, "string");
  strictEqual(bodyValue.value["b"].value, 2);
  strictEqual(bodyValue.value["b"].kind, "number");
  strictEqual(bodyValue.value["b"].type.kind, "int32");
  strictEqual(bodyValue.value["prop"].value, "prop");
  strictEqual(bodyValue.value["prop"].kind, "string");
  strictEqual(bodyValue.value["prop"].type.kind, "string");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkModelExample diagnostic", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModelDiagnostic.json",
    `${__dirname}/example-types/getModelDiagnostic.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        a: string;
        b: int32;
      }

      op getModelDiagnostic(): Test;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getModelDiagnostic.json' does not follow its definition:\n{"c":true}`,
  });
});

it("SdkModelExample from discriminated types", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModelDiscriminator.json",
    `${__dirname}/example-types/getModelDiscriminator.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      @discriminator("kind")
      model Fish {
        friends?: Fish[];
        hate?: Record<Fish>;
        partner?: Fish;
      }

      @discriminator("sharktype")
      model Shark extends Fish {
        kind: "shark";
        age: int32;
      }

      model Salmon extends Fish {
        kind: "salmon";
      }

      model SawShark extends Shark {
        sharktype: "saw";
        info: string[];
        prop: int32[];
      }

      model GoblinShark extends Shark {
        sharktype: "goblin";
      }

      op getModelDiscriminator(): Shark;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "SawShark");
  strictEqual(Object.keys(bodyValue.value).length, 6);
  strictEqual(bodyValue.value["kind"].value, "shark");
  strictEqual(bodyValue.value["kind"].kind, "string");
  strictEqual(bodyValue.value["kind"].type.kind, "constant");
  strictEqual(bodyValue.value["sharktype"].value, "saw");
  strictEqual(bodyValue.value["sharktype"].kind, "string");
  strictEqual(bodyValue.value["sharktype"].type.kind, "constant");

  strictEqual(bodyValue.value["friends"].kind, "array");
  const friend = bodyValue.value["friends"].value[0];
  ok(friend);
  strictEqual(friend.type.kind, "model");
  strictEqual(friend.type.name, "GoblinShark");
  strictEqual(friend.kind, "model");
  strictEqual(friend.value["kind"].value, "shark");
  strictEqual(friend.value["kind"].kind, "string");
  strictEqual(friend.value["kind"].type.kind, "constant");
  strictEqual(friend.value["sharktype"].value, "goblin");
  strictEqual(friend.value["sharktype"].kind, "string");
  strictEqual(friend.value["sharktype"].type.kind, "constant");

  strictEqual(bodyValue.value["hate"].kind, "dict");
  const hate = bodyValue.value["hate"].value["most"];
  ok(hate);
  strictEqual(hate.type.kind, "model");
  strictEqual(hate.type.name, "Salmon");
  strictEqual(hate.kind, "model");
  strictEqual(hate.value["kind"].value, "salmon");
  strictEqual(hate.value["kind"].kind, "string");
  strictEqual(hate.value["kind"].type.kind, "constant");

  strictEqual(bodyValue.value["age"].value, 2);
  strictEqual(bodyValue.value["age"].kind, "number");
  strictEqual(bodyValue.value["age"].type.kind, "int32");

  strictEqual(bodyValue.value["prop"].kind, "array");
  strictEqual(bodyValue.value["prop"].value[0].value, 1);
  strictEqual(bodyValue.value["prop"].value[0].kind, "number");
  strictEqual(bodyValue.value["prop"].value[0].type.kind, "int32");
  strictEqual(bodyValue.value["prop"].value[1].value, 2);
  strictEqual(bodyValue.value["prop"].value[1].kind, "number");
  strictEqual(bodyValue.value["prop"].value[1].type.kind, "int32");
  strictEqual(bodyValue.value["prop"].value[2].value, 3);
  strictEqual(bodyValue.value["prop"].value[2].kind, "number");
  strictEqual(bodyValue.value["prop"].value[2].type.kind, "int32");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkModelExample from discriminated types with string kind fallback", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModelDiscriminatorStringFallback.json",
    `${__dirname}/example-types/getModelDiscriminatorStringFallback.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      @discriminator("kind")
      model Fish {
        kind: string;
      }

      op getModelDiscriminator(): Fish;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Fish");
  strictEqual(Object.keys(bodyValue.value).length, 1);
  strictEqual(bodyValue.value["kind"].value, "shark");
  strictEqual(bodyValue.value["kind"].kind, "string");
  strictEqual(bodyValue.value["kind"].type.kind, "string");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkModelExample from discriminated types with string kind with extra property fallback", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModelDiscriminatorStringExtraPropertyFallback.json",
    `${__dirname}/example-types/getModelDiscriminatorStringExtraPropertyFallback.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      @discriminator("kind")
      model Fish {
        kind: string;
      }

      op getModelDiscriminator(): Fish;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Fish");
  strictEqual(Object.keys(bodyValue.value).length, 1);
  strictEqual(bodyValue.value["kind"].value, "shark");
  strictEqual(bodyValue.value["kind"].kind, "string");
  strictEqual(bodyValue.value["kind"].type.kind, "string");

  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getModelDiscriminatorStringExtraPropertyFallback.json' does not follow its definition:\n{"extraProperty":"test"}`,
  });
});

it("SdkModelExample from discriminated types with enum kind fallback", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModelDiscriminatorEnumFallback.json",
    `${__dirname}/example-types/getModelDiscriminatorEnumFallback.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      @discriminator("kind")
      model Fish {
        kind: FishKind;
      }

      enum FishKind {
        "shark",
        "salmon",
      }

      op getModelDiscriminator(): Fish;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Fish");
  strictEqual(Object.keys(bodyValue.value).length, 1);
  strictEqual(bodyValue.value["kind"].value, "shark");
  strictEqual(bodyValue.value["kind"].kind, "string");
  strictEqual(bodyValue.value["kind"].type.kind, "enum");
  strictEqual(bodyValue.value["kind"].type.isFixed, true);

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkModelExample from discriminated types with enum kind with wrong kind fallback", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModelDiscriminatorEnumWrongKindFallback.json",
    `${__dirname}/example-types/getModelDiscriminatorEnumWrongKindFallback.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      @discriminator("kind")
      model Fish {
        kind: FishKind;
      }

      enum FishKind {
        "shark",
        "salmon",
      }

      op getModelDiscriminator(): Fish;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Fish");
  strictEqual(Object.keys(bodyValue.value).length, 0);

  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
    message: `Value in example file 'getModelDiscriminatorEnumWrongKindFallback.json' does not follow its definition:\n"goldfish"`,
  });
});

it("SdkModelExample from discriminated types with union kind fallback", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModelDiscriminatorUnionFallback.json",
    `${__dirname}/example-types/getModelDiscriminatorUnionFallback.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      @discriminator("kind")
      model Fish {
        kind: FishKind;
      }

      union FishKind {
        string,
        "shark",
        "salmon",
      }

      op getModelDiscriminator(): Fish;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Fish");
  strictEqual(Object.keys(bodyValue.value).length, 1);
  strictEqual(bodyValue.value["kind"].value, "goldfish");
  strictEqual(bodyValue.value["kind"].kind, "string");
  strictEqual(bodyValue.value["kind"].type.kind, "enum");
  strictEqual(bodyValue.value["kind"].type.isFixed, false);

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkModelExample with additional properties", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModelAdditionalProperties.json",
    `${__dirname}/example-types/getModelAdditionalProperties.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        a: string;
        b: int32;
        
        ...Record<unknown>;
      }

      op getModelAdditionalProperties(): Test;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Test");
  strictEqual(Object.keys(bodyValue.value).length, 2);
  strictEqual(bodyValue.value["a"].value, "a");
  strictEqual(bodyValue.value["a"].kind, "string");
  strictEqual(bodyValue.value["a"].type.kind, "string");
  strictEqual(bodyValue.value["b"].value, 2);
  strictEqual(bodyValue.value["b"].kind, "number");
  strictEqual(bodyValue.value["b"].type.kind, "int32");

  ok(bodyValue.additionalPropertiesValue);
  strictEqual(Object.keys(bodyValue.additionalPropertiesValue).length, 2);
  strictEqual(bodyValue.additionalPropertiesValue["c"].value, true);
  strictEqual(bodyValue.additionalPropertiesValue["c"].kind, "unknown");
  strictEqual(bodyValue.additionalPropertiesValue["c"].type.kind, "unknown");
  deepStrictEqual(bodyValue.additionalPropertiesValue["d"].value, [1, 2, 3]);
  strictEqual(bodyValue.additionalPropertiesValue["d"].kind, "unknown");
  strictEqual(bodyValue.additionalPropertiesValue["d"].type.kind, "unknown");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("SdkModelExample with extra paramters", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getModelWithExtraParamter.json",
    `${__dirname}/example-types/getModelWithExtraParamter.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        a: string;
        b: int32;
        @header("x-ms-prop")
        prop: string;
      }

      op getModelWithExtraParamter(): Test;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);
  const headers = response.headers;
  ok(headers);
  strictEqual(headers.length, 1);
  strictEqual(headers[0].value.value, "test");
  strictEqual(headers[0].header.serializedName, "x-ms-prop");

  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Test");
  strictEqual(Object.keys(bodyValue.value).length, 2);
  strictEqual(bodyValue.value["a"].value, "a");
  strictEqual(bodyValue.value["a"].kind, "string");
  strictEqual(bodyValue.value["a"].type.kind, "string");
  strictEqual(bodyValue.value["b"].value, 2);
  strictEqual(bodyValue.value["b"].kind, "number");
  strictEqual(bodyValue.value["b"].type.kind, "int32");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("unknown type with null example value", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getUnknownNull.json",
    `${__dirname}/example-types/getUnknownNull.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        prop: unknown;
      }

      op getUnknownNull(): Test;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);

  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Test");
  strictEqual(Object.keys(bodyValue.value).length, 1);
  strictEqual(bodyValue.value["prop"].value, null);
  strictEqual(bodyValue.value["prop"].kind, "unknown");
  strictEqual(bodyValue.value["prop"].type.kind, "unknown");

  expectDiagnostics(runner.context.diagnostics, []);
});

it("unexpected null value", async () => {
  await runner.host.addRealTypeSpecFile(
    "./examples/getUnexpectedNull.json",
    `${__dirname}/example-types/getUnexpectedNull.json`,
  );
  await runner.compile(`
    @service
    namespace TestClient {
      model Test {
        a: string;
        b: int32;
        c: {prop: string};
        d: {prop: string} | null;
        e: utcDateTime;
        f: duration;
        g: TestEnum;
      }

      enum TestEnum {
          one,two,three
      }

      op getUnexpectedNull(): Test;
    }
  `);

  const operation = (
    runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
  ).operation;
  ok(operation);
  strictEqual(operation.examples?.length, 1);
  const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
  ok(response);

  const bodyValue = response.bodyValue;
  ok(bodyValue);
  strictEqual(bodyValue.kind, "model");
  strictEqual(bodyValue.type.kind, "model");
  strictEqual(bodyValue.type.name, "Test");
  strictEqual(Object.keys(bodyValue.value).length, 1);
  ok(bodyValue.value["d"]);

  expectDiagnostics(runner.context.diagnostics, []);
});
