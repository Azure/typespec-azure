import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
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

describe("@clientOption in decorators array", () => {
  it("should appear in decorators array for model", async () => {
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
    strictEqual(sdkModel !== undefined, true);

    const clientOptionDecorator = sdkModel!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    strictEqual(clientOptionDecorator !== undefined, true);
    deepStrictEqual(clientOptionDecorator!.arguments, {
      name: "enableFeatureFoo",
      value: true,
      scope: "python",
    });
  });

  it("should support multiple @clientOption decorators on same target", async () => {
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
    strictEqual(sdkModel !== undefined, true);

    const clientOptionDecorators = sdkModel!.decorators.filter(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    strictEqual(clientOptionDecorators.length, 2);

    // Verify each decorator has the correct name and value
    const fooDecorator = clientOptionDecorators.find(
      (d) => d.arguments.name === "enableFeatureFoo",
    );
    ok(fooDecorator, "enableFeatureFoo decorator should exist");
    strictEqual(fooDecorator!.arguments.name, "enableFeatureFoo");
    strictEqual(fooDecorator!.arguments.value, true);
    strictEqual(fooDecorator!.arguments.scope, "python");

    const barDecorator = clientOptionDecorators.find(
      (d) => d.arguments.name === "enableFeatureBar",
    );
    ok(barDecorator, "enableFeatureBar decorator should exist");
    strictEqual(barDecorator!.arguments.name, "enableFeatureBar");
    strictEqual(barDecorator!.arguments.value, "value");
    strictEqual(barDecorator!.arguments.scope, "python");
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
    const boolDecorator = sdkModelBool!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    ok(boolDecorator, "clientOption decorator should exist on TestBool");
    strictEqual(boolDecorator!.arguments.name, "boolOption");
    strictEqual(boolDecorator!.arguments.value, true);
    strictEqual(typeof boolDecorator!.arguments.value, "boolean");

    // Verify string value type
    const sdkModelString = context.sdkPackage.models.find((m) => m.name === "TestString");
    ok(sdkModelString, "TestString model should exist");
    const stringDecorator = sdkModelString!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    ok(stringDecorator, "clientOption decorator should exist on TestString");
    strictEqual(stringDecorator!.arguments.name, "stringOption");
    strictEqual(stringDecorator!.arguments.value, "someValue");
    strictEqual(typeof stringDecorator!.arguments.value, "string");

    // Verify number value type
    const sdkModelNumber = context.sdkPackage.models.find((m) => m.name === "TestNumber");
    ok(sdkModelNumber, "TestNumber model should exist");
    const numberDecorator = sdkModelNumber!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    ok(numberDecorator, "clientOption decorator should exist on TestNumber");
    strictEqual(numberDecorator!.arguments.name, "numberOption");
    strictEqual(numberDecorator!.arguments.value, 42);
    strictEqual(typeof numberDecorator!.arguments.value, "number");
  });

  it("should appear in decorators array for operation", async () => {
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

    const clientOptionDecorator = sdkMethod!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    ok(clientOptionDecorator, "clientOption decorator should be present");
    deepStrictEqual(clientOptionDecorator!.arguments, {
      name: "operationFlag",
      value: "customValue",
      scope: "python",
    });
  });

  it("should appear in decorators array for enum", async () => {
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

    const clientOptionDecorator = sdkEnum!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    ok(clientOptionDecorator, "clientOption decorator should be present");
    deepStrictEqual(clientOptionDecorator!.arguments, {
      name: "enumFlag",
      value: true,
      scope: "python",
    });
  });

  it("should appear in decorators array for model property", async () => {
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

    const sdkProperty = sdkModel!.properties.find((p) => p.name === "myProp");
    ok(sdkProperty, "SDK property should exist");

    const clientOptionDecorator = sdkProperty!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    ok(clientOptionDecorator, "clientOption decorator should be present on property");
    deepStrictEqual(clientOptionDecorator!.arguments, {
      name: "propertyFlag",
      value: "propValue",
      scope: "python",
    });
  });

  it("should respect scope filtering - decorator appears when scope matches emitter", async () => {
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

    const clientOptionDecorator = sdkModel!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    ok(clientOptionDecorator, "clientOption decorator should be present for matching scope");

    // Verify the name and value are correctly captured
    strictEqual(clientOptionDecorator!.arguments.name, "pythonOnlyFlag");
    strictEqual(clientOptionDecorator!.arguments.value, true);
    strictEqual(clientOptionDecorator!.arguments.scope, "python");
  });

  it("should not include decorator when scope does not match emitter", async () => {
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

    // The decorator should NOT appear in the decorators array
    const sdkModel = context.sdkPackage.models.find((m) => m.name === "Test");
    ok(sdkModel, "SDK model should exist");

    const clientOptionDecorator = sdkModel!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    strictEqual(
      clientOptionDecorator,
      undefined,
      "clientOption decorator should not be present when scope doesn't match emitter",
    );
  });

  it("should include all argument fields in decorator info", async () => {
    const { program } = await SimpleTesterWithService.compile(`
      #suppress "@azure-tools/typespec-client-generator-core/client-option"
      @clientOption("testOption", "testValue", "python")
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

    const clientOptionDecorator = sdkModel!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    ok(clientOptionDecorator, "clientOption decorator should be present");

    // Verify the decorator has the correct name format
    strictEqual(
      clientOptionDecorator!.name,
      "Azure.ClientGenerator.Core.@clientOption",
      "Decorator name should be fully qualified",
    );

    // Verify all arguments are present
    ok("name" in clientOptionDecorator!.arguments, "arguments should have 'name' field");
    ok("value" in clientOptionDecorator!.arguments, "arguments should have 'value' field");
    ok("scope" in clientOptionDecorator!.arguments, "arguments should have 'scope' field");

    // Verify argument values
    strictEqual(clientOptionDecorator!.arguments.name, "testOption");
    strictEqual(clientOptionDecorator!.arguments.value, "testValue");
    strictEqual(clientOptionDecorator!.arguments.scope, "python");
  });

  it("should handle decorator without scope argument", async () => {
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

    const clientOptionDecorator = sdkModel!.decorators.find(
      (d) => d.name === "Azure.ClientGenerator.Core.@clientOption",
    );
    ok(clientOptionDecorator, "clientOption decorator should be present");
    strictEqual(clientOptionDecorator!.arguments.name, "noScopeOption");
    strictEqual(clientOptionDecorator!.arguments.value, 123);
    // scope should be undefined when not provided
    strictEqual(clientOptionDecorator!.arguments.scope, undefined);
  });
});
