import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { getClientOptions } from "../../src/public-utils.js";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";

describe("@clientOption diagnostics", () => {
  it("should emit client-option warning always", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      @service
      namespace MyService;

      @clientOption("enableFeatureFoo", true, "python")
      model Test {
        id: string;
      }
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/client-option",
    });
  });

  it("should emit both client-option and client-option-requires-scope warnings when scope is missing", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      @service
      namespace MyService;

      @clientOption("enableFeatureFoo", true)
      model Test {
        id: string;
      }
    `);

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/client-option",
      },
      {
        code: "@azure-tools/typespec-client-generator-core/client-option-requires-scope",
      },
    ]);
  });

  it("should only emit client-option warning when scope is provided", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      @service
      namespace MyService;

      @clientOption("enableFeatureFoo", true, "python")
      model Test {
        id: string;
      }
    `);

    // Should only have the client-option warning, not client-option-requires-scope
    strictEqual(diagnostics.length, 1);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/client-option",
    });
  });
});

describe("@clientOption with getClientOptions getter", () => {
  it("should return client options for model", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("enableFeatureFoo", true, "python")
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 1);
    deepStrictEqual(clientOptions[0], {
      name: "enableFeatureFoo",
      value: true,
      scope: "python",
    });
  });

  it("should return multiple client options on same target", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("enableFeatureFoo", true, "python")
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("enableFeatureBar", "value", "python")
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 2);

    // Verify each option has the correct name and value
    const fooOption = clientOptions.find((o) => o.name === "enableFeatureFoo");
    ok(fooOption, "enableFeatureFoo option should exist");
    strictEqual(fooOption.name, "enableFeatureFoo");
    strictEqual(fooOption.value, true);
    strictEqual(fooOption.scope, "python");

    const barOption = clientOptions.find((o) => o.name === "enableFeatureBar");
    ok(barOption, "enableFeatureBar option should exist");
    strictEqual(barOption.name, "enableFeatureBar");
    strictEqual(barOption.value, "value");
    strictEqual(barOption.scope, "python");
  });

  it("should support different value types", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("boolOption", true, "python")
      @test
      model TestBool {
        id: string;
      }

      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("stringOption", "someValue", "python")
      @test
      model TestString {
        id: string;
      }

      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("numberOption", 42, "python")
      @test
      model TestNumber {
        id: string;
      }

      @route("/bool") op getBool(): TestBool;
      @route("/string") op getString(): TestString;
      @route("/number") op getNumber(): TestNumber;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    // Verify boolean value type
    const sdkModelBool = context.sdkPackage.models.find((m) => m.name === "TestBool");
    ok(sdkModelBool, "TestBool model should exist");
    const boolOptions = getClientOptions(sdkModelBool.decorators);
    strictEqual(boolOptions.length, 1);
    strictEqual(boolOptions[0].name, "boolOption");
    strictEqual(boolOptions[0].value, true);
    strictEqual(typeof boolOptions[0].value, "boolean");

    // Verify string value type
    const sdkModelString = context.sdkPackage.models.find((m) => m.name === "TestString");
    ok(sdkModelString, "TestString model should exist");
    const stringOptions = getClientOptions(sdkModelString.decorators);
    strictEqual(stringOptions.length, 1);
    strictEqual(stringOptions[0].name, "stringOption");
    strictEqual(stringOptions[0].value, "someValue");
    strictEqual(typeof stringOptions[0].value, "string");

    // Verify number value type
    const sdkModelNumber = context.sdkPackage.models.find((m) => m.name === "TestNumber");
    ok(sdkModelNumber, "TestNumber model should exist");
    const numberOptions = getClientOptions(sdkModelNumber.decorators);
    strictEqual(numberOptions.length, 1);
    strictEqual(numberOptions[0].name, "numberOption");
    strictEqual(numberOptions[0].value, 42);
    strictEqual(typeof numberOptions[0].value, "number");
  });

  it("should return client options for operation", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("operationFlag", "customValue", "python")
      @test
      op testOp(): string;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkMethod = context.sdkPackage.clients[0].methods.find(
      (m) => m.kind === "basic" && m.name === "testOp",
    );
    ok(sdkMethod, "SDK method should exist");

    const clientOptions = getClientOptions(sdkMethod.decorators);
    strictEqual(clientOptions.length, 1);
    deepStrictEqual(clientOptions[0], {
      name: "operationFlag",
      value: "customValue",
      scope: "python",
    });
  });

  it("should return client options for enum", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("enumFlag", true, "python")
      @usage(Usage.input)
      @test
      enum TestEnum {
        One,
        Two,
      }

      op getTest(@query value: TestEnum): string;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkEnum = context.sdkPackage.enums.find((e) => e.name === "TestEnum");
    ok(sdkEnum, "SDK enum should exist");

    const clientOptions = getClientOptions(sdkEnum.decorators);
    strictEqual(clientOptions.length, 1);
    deepStrictEqual(clientOptions[0], {
      name: "enumFlag",
      value: true,
      scope: "python",
    });
  });

  it("should return client options for model property", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      @test
      model Test {
        #suppress "@azure-tools/typespec-client-generator-core/client-option"
        @clientOption("propertyFlag", "propValue", "python")
        myProp: string;
      }

      op getTest(): Test;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const sdkProperty = sdkModel.properties.find((p) => p.name === "myProp");
    ok(sdkProperty, "SDK property should exist");

    const clientOptions = getClientOptions(sdkProperty.decorators);
    strictEqual(clientOptions.length, 1);
    deepStrictEqual(clientOptions[0], {
      name: "propertyFlag",
      value: "propValue",
      scope: "python",
    });
  });

  it("should return options when scope matches emitter", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("pythonOnlyFlag", true, "python")
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    // Configure with python emitter
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 1);
    strictEqual(clientOptions[0].name, "pythonOnlyFlag");
    strictEqual(clientOptions[0].value, true);
    strictEqual(clientOptions[0].scope, "python");
  });

  it("should return empty array when scope does not match emitter", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("javaOnlyFlag", true, "java")
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    // Configure with python emitter, but decorator is scoped to java
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    // The decorator should NOT appear - getClientOptions should return empty array
    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 0);
  });

  it("should handle option without scope argument", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      #suppress "@azure-tools/typespec-client-generator-core/client-option-requires-scope"
      @clientOption("noScopeOption", 123)
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 1);
    strictEqual(clientOptions[0].name, "noScopeOption");
    strictEqual(clientOptions[0].value, 123);
    // scope should be undefined when not provided
    strictEqual(clientOptions[0].scope, undefined);
  });

  it("should support array value type", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("arrayOption", #["item1", "item2", "item3"], "python")
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 1);
    strictEqual(clientOptions[0].name, "arrayOption");
    ok(Array.isArray(clientOptions[0].value), "value should be an array");
    deepStrictEqual(clientOptions[0].value, ["item1", "item2", "item3"]);
    strictEqual(clientOptions[0].scope, "python");
  });

  it("should support object/map value type", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("objectOption", #{key1: "value1", key2: "value2"}, "python")
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 1);
    strictEqual(clientOptions[0].name, "objectOption");
    ok(
      typeof clientOptions[0].value === "object" && !Array.isArray(clientOptions[0].value),
      "value should be an object",
    );
    deepStrictEqual(clientOptions[0].value, { key1: "value1", key2: "value2" });
    strictEqual(clientOptions[0].scope, "python");
  });

  it("should support nested object and array values", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("nestedOption", #{
        stringField: "hello",
        numberField: 42,
        arrayField: #[1, 2, 3],
        nestedObject: #{inner: "value"}
      }, "python")
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 1);
    strictEqual(clientOptions[0].name, "nestedOption");

    const value = clientOptions[0].value as unknown as Record<string, unknown>;
    strictEqual(value.stringField, "hello");
    strictEqual(value.numberField, 42);
    deepStrictEqual(value.arrayField, [1, 2, 3]);
    deepStrictEqual(value.nestedObject, { inner: "value" });
    strictEqual(clientOptions[0].scope, "python");
  });

  it("should support array of numbers", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("numberArrayOption", #[1, 2, 3, 4, 5], "python")
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 1);
    strictEqual(clientOptions[0].name, "numberArrayOption");
    ok(Array.isArray(clientOptions[0].value), "value should be an array");
    deepStrictEqual(clientOptions[0].value, [1, 2, 3, 4, 5]);
  });

  it("should support array of mixed types", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("mixedArrayOption", #["string", 42, true], "python")
      @test
      model Test {
        id: string;
      }

      op getTest(): Test;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptions = getClientOptions(sdkModel.decorators);
    strictEqual(clientOptions.length, 1);
    strictEqual(clientOptions[0].name, "mixedArrayOption");
    ok(Array.isArray(clientOptions[0].value), "value should be an array");
    deepStrictEqual(clientOptions[0].value, ["string", 42, true]);
  });
});
