import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkDateTimeType,
  SdkDurationType,
  SdkHttpOperation,
  SdkNullableType,
  SdkServiceMethod,
} from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: example types", () => {
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
      `${__dirname}/example-types/getString.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getString(): string;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "string");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, "test");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "string");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkStringExample diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getStringDiagnostic.json",
      `${__dirname}/example-types/getStringDiagnostic.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getStringDiagnostic(): string;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue, undefined);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'getStringDiagnostic.json' does not follow its definition:\n123`,
    });
  });

  it("SdkStringExample from constant", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getStringFromConstant.json",
      `${__dirname}/example-types/getStringFromConstant.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getStringFromConstant(): "test";
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "string");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, "test");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "constant");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkStringExample from constant diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getStringFromConstantDiagnostic.json",
      `${__dirname}/example-types/getStringFromConstantDiagnostic.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getStringFromConstantDiagnostic(): "test";
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue, undefined);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'getStringFromConstantDiagnostic.json' does not follow its definition:\n123`,
    });
  });

  it("SdkStringExample from enum", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getStringFromEnum.json",
      `${__dirname}/example-types/getStringFromEnum.json`
    );
    await runner.compile(`
      @service({})
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
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "string");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, "one");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "enum");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkStringExample from enum diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getStringFromEnumDiagnostic.json",
      `${__dirname}/example-types/getStringFromEnumDiagnostic.json`
    );
    await runner.compile(`
      @service({})
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
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue, undefined);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'getStringFromEnumDiagnostic.json' does not follow its definition:\n"four"`,
    });
  });

  it("SdkStringExample from enum value", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getStringFromEnumValue.json",
      `${__dirname}/example-types/getStringFromEnumValue.json`
    );
    await runner.compile(`
      @service({})
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
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "string");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, "one");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "enumvalue");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkStringExample from enum value diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getStringFromEnumValueDiagnostic.json",
      `${__dirname}/example-types/getStringFromEnumValueDiagnostic.json`
    );
    await runner.compile(`
      @service({})
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
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue, undefined);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'getStringFromEnumValueDiagnostic.json' does not follow its definition:\n"four"`,
    });
  });

  it("SdkStringExample from datetime", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getStringFromDataTime.json",
      `${__dirname}/example-types/getStringFromDataTime.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getStringFromDataTime(): utcDateTime;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "string");
    strictEqual(
      operation.examples[0].responses.get(200)?.bodyValue?.value,
      "2022-08-26T18:38:00.000Z"
    );
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "utcDateTime");
    strictEqual(
      (operation.examples[0].responses.get(200)?.bodyValue?.type as SdkDateTimeType).wireType.kind,
      "string"
    );

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkStringExample from duration", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getStringFromDuration.json",
      `${__dirname}/example-types/getStringFromDuration.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getStringFromDuration(): duration;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "string");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, "P40D");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "duration");
    strictEqual(
      (operation.examples[0].responses.get(200)?.bodyValue?.type as SdkDurationType).wireType.kind,
      "string"
    );

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkNumberExample", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getNumber.json",
      `${__dirname}/example-types/getNumber.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getNumber(): float32;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "number");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, 31.752);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "float32");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkNumberExample diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getNumberDiagnostic.json",
      `${__dirname}/example-types/getNumberDiagnostic.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getNumberDiagnostic(): float32;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue, undefined);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'getNumberDiagnostic.json' does not follow its definition:\n"123"`,
    });
  });

  it("SdkNumberExample from datetime", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getNumberFromDateTime.json",
      `${__dirname}/example-types/getNumberFromDateTime.json`
    );
    await runner.compile(`
      @service({})
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
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "number");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, 1686566864);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "utcDateTime");
    strictEqual(
      (operation.examples[0].responses.get(200)?.bodyValue?.type as SdkDateTimeType).wireType.kind,
      "int64"
    );

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkNumberExample from duration", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getNumberFromDuration.json",
      `${__dirname}/example-types/getNumberFromDuration.json`
    );
    await runner.compile(`
      @service({})
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
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "number");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, 62.525);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "duration");
    strictEqual(
      (operation.examples[0].responses.get(200)?.bodyValue?.type as SdkDurationType).wireType.kind,
      "float"
    );

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkBooleanExample", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getBoolean.json",
      `${__dirname}/example-types/getBoolean.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getBoolean(): boolean;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "boolean");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, true);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "boolean");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkBooleanExample diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getBooleanDiagnostic.json",
      `${__dirname}/example-types/getBooleanDiagnostic.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getBooleanDiagnostic(): boolean;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue, undefined);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'getBooleanDiagnostic.json' does not follow its definition:\n123`,
    });
  });

  it("SdkNullExample", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getNull.json",
      `${__dirname}/example-types/getNull.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getNull(): {@body body: string | null};
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "null");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, null);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "nullable");
    strictEqual(
      (operation.examples[0].responses.get(200)?.bodyValue?.type as SdkNullableType).type.kind,
      "string"
    );

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkAnyExample", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getAny.json",
      `${__dirname}/example-types/getAny.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getAny(): unknown;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "unknown");
    deepStrictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, { test: 123 });

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkUnionExample", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getUnion.json",
      `${__dirname}/example-types/getUnion.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getUnion(): {@body body: string | int32};
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.kind, "union");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.value, "test");
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue?.type.kind, "union");
  });

  it("SdkArrayExample", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getArray.json",
      `${__dirname}/example-types/getArray.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getArray(): string[];
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    const example = operation.examples[0].responses.get(200)?.bodyValue;
    ok(example);
    strictEqual(example.kind, "array");
    strictEqual(example.value.length, 3);
    strictEqual(example.type.kind, "array");
    strictEqual(example.type.valueType.kind, "string");
    strictEqual(example.value[0].value, "a");
    strictEqual(example.value[0].kind, "string");
    strictEqual(example.value[0].type.kind, "string");
    strictEqual(example.value[1].value, "b");
    strictEqual(example.value[1].kind, "string");
    strictEqual(example.value[1].type.kind, "string");
    strictEqual(example.value[2].value, "c");
    strictEqual(example.value[2].kind, "string");
    strictEqual(example.value[2].type.kind, "string");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkArrayExample diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getArrayDiagnostic.json",
      `${__dirname}/example-types/getArrayDiagnostic.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getArrayDiagnostic(): string[];
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue, undefined);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'getArrayDiagnostic.json' does not follow its definition:\n"test"`,
    });
  });

  it("SdkDictionaryExample", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getDictionary.json",
      `${__dirname}/example-types/getDictionary.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getDictionary(): Record<string>;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    const example = operation.examples[0].responses.get(200)?.bodyValue;
    ok(example);
    strictEqual(example.kind, "dict");
    strictEqual(Object.keys(example.value).length, 3);
    strictEqual(example.value["a"].value, "a");
    strictEqual(example.value["a"].kind, "string");
    strictEqual(example.value["a"].type.kind, "string");
    strictEqual(example.value["b"].value, "b");
    strictEqual(example.value["b"].kind, "string");
    strictEqual(example.value["b"].type.kind, "string");
    strictEqual(example.value["c"].value, "c");
    strictEqual(example.value["c"].kind, "string");
    strictEqual(example.value["c"].type.kind, "string");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkDictionaryExample diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getDictionaryDiagnostic.json",
      `${__dirname}/example-types/getDictionaryDiagnostic.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        op getDictionaryDiagnostic(): Record<string>;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue, undefined);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'getDictionaryDiagnostic.json' does not follow its definition:\n"test"`,
    });
  });

  it("SdkModelExample", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getModel.json",
      `${__dirname}/example-types/getModel.json`
    );
    await runner.compile(`
      @service({})
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
    const example = operation.examples[0].responses.get(200)?.bodyValue;
    ok(example);
    strictEqual(example.kind, "model");
    strictEqual(example.type.kind, "model");
    strictEqual(example.type.name, "Test");
    strictEqual(Object.keys(example.value).length, 3);
    strictEqual(example.value["a"].value, "a");
    strictEqual(example.value["a"].kind, "string");
    strictEqual(example.value["a"].type.kind, "string");
    strictEqual(example.value["b"].value, 2);
    strictEqual(example.value["b"].kind, "number");
    strictEqual(example.value["b"].type.kind, "int32");
    strictEqual(example.value["prop"].value, "prop");
    strictEqual(example.value["prop"].kind, "string");
    strictEqual(example.value["prop"].type.kind, "string");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkModelExample diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getModelDiagnostic.json",
      `${__dirname}/example-types/getModelDiagnostic.json`
    );
    await runner.compile(`
      @service({})
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
      `${__dirname}/example-types/getModelDiscriminator.json`
    );
    await runner.compile(`
      @service({})
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
    const example = operation.examples[0].responses.get(200)?.bodyValue;
    ok(example);
    strictEqual(example.kind, "model");
    strictEqual(example.type.kind, "model");
    strictEqual(example.type.name, "SawShark");
    strictEqual(Object.keys(example.value).length, 6);
    strictEqual(example.value["kind"].value, "shark");
    strictEqual(example.value["kind"].kind, "string");
    strictEqual(example.value["kind"].type.kind, "constant");
    strictEqual(example.value["sharktype"].value, "saw");
    strictEqual(example.value["sharktype"].kind, "string");
    strictEqual(example.value["sharktype"].type.kind, "constant");

    strictEqual(example.value["friends"].kind, "array");
    const friend = example.value["friends"].value[0];
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

    strictEqual(example.value["hate"].kind, "dict");
    const hate = example.value["hate"].value["most"];
    ok(hate);
    strictEqual(hate.type.kind, "model");
    strictEqual(hate.type.name, "Salmon");
    strictEqual(hate.kind, "model");
    strictEqual(hate.value["kind"].value, "salmon");
    strictEqual(hate.value["kind"].kind, "string");
    strictEqual(hate.value["kind"].type.kind, "constant");

    strictEqual(example.value["age"].value, 2);
    strictEqual(example.value["age"].kind, "number");
    strictEqual(example.value["age"].type.kind, "int32");

    strictEqual(example.value["prop"].kind, "array");
    strictEqual(example.value["prop"].value[0].value, 1);
    strictEqual(example.value["prop"].value[0].kind, "number");
    strictEqual(example.value["prop"].value[0].type.kind, "int32");
    strictEqual(example.value["prop"].value[1].value, 2);
    strictEqual(example.value["prop"].value[1].kind, "number");
    strictEqual(example.value["prop"].value[1].type.kind, "int32");
    strictEqual(example.value["prop"].value[2].value, 3);
    strictEqual(example.value["prop"].value[2].kind, "number");
    strictEqual(example.value["prop"].value[2].type.kind, "int32");

    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("SdkModelExample from discriminated types diagnostic", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getModelDiscriminatorDiagnostic.json",
      `${__dirname}/example-types/getModelDiscriminatorDiagnostic.json`
    );
    await runner.compile(`
      @service({})
      namespace TestClient {
        @discriminator("kind")
        model Fish {
        }

        @discriminator("sharktype")
        model Shark extends Fish {
          kind: "shark";
        }

        model Salmon extends Fish {
          kind: "salmon";
        }

        model SawShark extends Shark {
          sharktype: "saw";
        }

        model GoblinShark extends Shark {
          sharktype: "goblin";
        }

        op getModelDiscriminatorDiagnostic(): Shark;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);
    strictEqual(operation.examples[0].responses.get(200)?.bodyValue, undefined);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/example-value-no-mapping",
      message: `Value in example file 'getModelDiscriminatorDiagnostic.json' does not follow its definition:\n{"kind":"shark","sharktype":"test","age":2}`,
    });
  });
  1;
  it("SdkModelExample with additional properties", async () => {
    await runner.host.addRealTypeSpecFile(
      "./examples/getModelAdditionalProperties.json",
      `${__dirname}/example-types/getModelAdditionalProperties.json`
    );
    await runner.compile(`
      @service({})
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
    const example = operation.examples[0].responses.get(200)?.bodyValue;
    ok(example);
    strictEqual(example.kind, "model");
    strictEqual(example.type.kind, "model");
    strictEqual(example.type.name, "Test");
    strictEqual(Object.keys(example.value).length, 2);
    strictEqual(example.value["a"].value, "a");
    strictEqual(example.value["a"].kind, "string");
    strictEqual(example.value["a"].type.kind, "string");
    strictEqual(example.value["b"].value, 2);
    strictEqual(example.value["b"].kind, "number");
    strictEqual(example.value["b"].type.kind, "int32");

    ok(example.additionalPropertiesValue);
    strictEqual(Object.keys(example.additionalPropertiesValue).length, 2);
    strictEqual(example.additionalPropertiesValue["c"].value, true);
    strictEqual(example.additionalPropertiesValue["c"].kind, "unknown");
    strictEqual(example.additionalPropertiesValue["c"].type.kind, "unknown");
    deepStrictEqual(example.additionalPropertiesValue["d"].value, [1, 2, 3]);
    strictEqual(example.additionalPropertiesValue["d"].kind, "unknown");
    strictEqual(example.additionalPropertiesValue["d"].type.kind, "unknown");

    expectDiagnostics(runner.context.diagnostics, []);
  });
});
