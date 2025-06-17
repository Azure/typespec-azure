import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

describe("@usage decorator with extended values", () => {
  it("should support json usage", async () => {
    await runner.compileWithBuiltInService(`
      @usage(Usage.json)
      model TestModel {
        prop: string;
      }
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].usage & UsageFlags.Json, UsageFlags.Json);
    strictEqual(models[0].serializationOptions?.json?.name, "TestModel");
    strictEqual(models[0].properties[0].kind, "property");
    strictEqual(models[0].properties[0].serializationOptions.json?.name, "prop");
  });

  it("should support xml usage", async () => {
    await runner.compileWithBuiltInService(`
      @usage(Usage.xml)
      model TestModel {
        prop: string;
      }
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].usage & UsageFlags.Xml, UsageFlags.Xml);
    strictEqual(models[0].serializationOptions?.xml?.name, "TestModel");
    strictEqual(models[0].properties[0].kind, "property");
    strictEqual(models[0].properties[0].serializationOptions.xml?.name, "prop");
  });

  it("should support combined usage flags", async () => {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.json | Usage.xml)
      model TestModel {
        prop: string;
      }
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const expectedUsage = UsageFlags.Input | UsageFlags.Json | UsageFlags.Xml;
    strictEqual(models[0].usage & expectedUsage, expectedUsage);
    strictEqual(models[0].serializationOptions?.json?.name, "TestModel");
    strictEqual(models[0].serializationOptions?.xml?.name, "TestModel");
    strictEqual(models[0].properties[0].kind, "property");
    strictEqual(models[0].properties[0].serializationOptions.json?.name, "prop");
    strictEqual(models[0].properties[0].serializationOptions.xml?.name, "prop");
  });

  it("should add usage to existing operation-calculated usage", async () => {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.xml)
      model TestModel {
        prop: string;
      }

      op test(): TestModel;
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    // Should have Output (from operation) + Input + Xml (from @usage)
    const expectedUsage = UsageFlags.Output | UsageFlags.Input | UsageFlags.Xml;
    strictEqual(models[0].usage & expectedUsage, expectedUsage);
    strictEqual(models[0].serializationOptions?.xml?.name, "TestModel");
    strictEqual(models[0].properties[0].kind, "property");
    strictEqual(models[0].properties[0].serializationOptions.xml?.name, "prop");
  });

  it("should propagate extended usage to properties", async () => {
    await runner.compileWithBuiltInService(`
      model NestedModel {
        nestedProp: string;
      }

      @usage(Usage.json | Usage.xml)
      model TestModel {
        prop: string;
        nested: NestedModel;
      }
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);

    const testModel = models.find((m) => m.name === "TestModel")!;
    const nestedModel = models.find((m) => m.name === "NestedModel")!;

    // TestModel should have the explicitly set usage
    strictEqual(
      testModel.usage & (UsageFlags.Json | UsageFlags.Xml),
      UsageFlags.Json | UsageFlags.Xml,
    );
    strictEqual(testModel.serializationOptions?.json?.name, "TestModel");
    strictEqual(testModel.serializationOptions?.xml?.name, "TestModel");

    // NestedModel should inherit the usage from TestModel
    strictEqual(
      nestedModel.usage & (UsageFlags.Json | UsageFlags.Xml),
      UsageFlags.Json | UsageFlags.Xml,
    );
    strictEqual(nestedModel.serializationOptions?.json?.name, "NestedModel");
    strictEqual(nestedModel.serializationOptions?.xml?.name, "NestedModel");

    // Check property serialization options
    strictEqual(testModel.properties[0].kind, "property");
    strictEqual(testModel.properties[1].kind, "property");
    strictEqual(nestedModel.properties[0].kind, "property");
    strictEqual(testModel.properties[0].serializationOptions.json?.name, "prop");
    strictEqual(testModel.properties[0].serializationOptions.xml?.name, "prop");
    strictEqual(testModel.properties[1].serializationOptions.json?.name, "nested");
    strictEqual(testModel.properties[1].serializationOptions.xml?.name, "nested");
    strictEqual(nestedModel.properties[0].serializationOptions.json?.name, "nestedProp");
    strictEqual(nestedModel.properties[0].serializationOptions.xml?.name, "nestedProp");
  });
});
