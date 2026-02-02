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
  it("should return client option value for model", async () => {
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

    strictEqual(getClientOptions(sdkModel, "enableFeatureFoo"), true);
  });

  it("should return values for multiple client options on same target", async () => {
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

    strictEqual(getClientOptions(sdkModel, "enableFeatureFoo"), true);
    strictEqual(getClientOptions(sdkModel, "enableFeatureBar"), "value");
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
    const boolValue = getClientOptions(sdkModelBool, "boolOption");
    strictEqual(boolValue, true);
    strictEqual(typeof boolValue, "boolean");

    // Verify string value type
    const sdkModelString = context.sdkPackage.models.find((m) => m.name === "TestString");
    ok(sdkModelString, "TestString model should exist");
    const stringValue = getClientOptions(sdkModelString, "stringOption");
    strictEqual(stringValue, "someValue");
    strictEqual(typeof stringValue, "string");

    // Verify number value type
    const sdkModelNumber = context.sdkPackage.models.find((m) => m.name === "TestNumber");
    ok(sdkModelNumber, "TestNumber model should exist");
    const numberValue = getClientOptions(sdkModelNumber, "numberOption");
    strictEqual(numberValue, 42);
    strictEqual(typeof numberValue, "number");
  });

  it("should return client option value for operation", async () => {
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

    strictEqual(getClientOptions(sdkMethod, "operationFlag"), "customValue");
  });

  it("should return client option value for enum", async () => {
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

    strictEqual(getClientOptions(sdkEnum, "enumFlag"), true);
  });

  it("should return client option value for model property", async () => {
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

    strictEqual(getClientOptions(sdkProperty, "propertyFlag"), "propValue");
  });

  it("should return value when scope matches emitter", async () => {
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

    strictEqual(getClientOptions(sdkModel, "pythonOnlyFlag"), true);
  });

  it("should return undefined when scope does not match emitter", async () => {
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

    // The decorator should NOT appear - getClientOptions should return undefined
    strictEqual(getClientOptions(sdkModel, "javaOnlyFlag"), undefined);
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

    strictEqual(getClientOptions(sdkModel, "noScopeOption"), 123);
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

    const value = getClientOptions(sdkModel, "arrayOption");
    ok(Array.isArray(value), "value should be an array");
    deepStrictEqual(value, ["item1", "item2", "item3"]);
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

    const value = getClientOptions(sdkModel, "objectOption");
    ok(typeof value === "object" && !Array.isArray(value), "value should be an object");
    deepStrictEqual(value, { key1: "value1", key2: "value2" });
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

    const value = getClientOptions(sdkModel, "nestedOption") as Record<string, unknown>;
    strictEqual(value.stringField, "hello");
    strictEqual(value.numberField, 42);
    deepStrictEqual(value.arrayField, [1, 2, 3]);
    deepStrictEqual(value.nestedObject, { inner: "value" });
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

    const value = getClientOptions(sdkModel, "numberArrayOption");
    ok(Array.isArray(value), "value should be an array");
    deepStrictEqual(value, [1, 2, 3, 4, 5]);
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

    const value = getClientOptions(sdkModel, "mixedArrayOption");
    ok(Array.isArray(value), "value should be an array");
    deepStrictEqual(value, ["string", 42, true]);
  });

  it("should return client option value for namespace", async () => {
    const { program } = await SimpleTester.compile(`
      @server("http://localhost:3000", "endpoint")
      @service
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("namespaceFlag", "nsValue", "python")
      namespace MyService {
        model TestModel {
          id: string;
        }
        op getTest(): TestModel;
      }
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    // The service namespace should have the decorator
    const sdkNamespace = context.sdkPackage.namespaces.find((ns) => ns.name === "MyService");
    ok(sdkNamespace, "SDK namespace should exist");

    strictEqual(getClientOptions(sdkNamespace, "namespaceFlag"), "nsValue");
  });

  it("should return client option value for interface (operation group)", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("interfaceFlag", true, "python")
      @test
      interface MyOperations {
        op doSomething(): string;
      }
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });

    // Interfaces become sub-clients (children of the main client)
    const client = context.sdkPackage.clients[0];
    ok(client, "Client should exist");

    // Find the sub-client for the interface
    const subClient = client.children?.find((c) => c.name === "MyOperations");
    ok(subClient, "Sub-client for interface should exist");

    strictEqual(getClientOptions(subClient, "interfaceFlag"), true);
  });

  it("should return undefined for non-existent key", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("existingOption", true, "python")
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

    strictEqual(getClientOptions(sdkModel, "nonExistentOption"), undefined);
  });
});
