import { XmlTestLibrary } from "@typespec/xml/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkEnumValueType } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: serialization options", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  it("default input json serialization option", async function () {
    await runner.compileWithBuiltInService(`
      model Blob {
        id: string;
      }

      op test(@body body: Blob): void;
    `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].serializationOptions.json?.name, "Blob");
    strictEqual(models[0].properties[0].kind, "property");
    strictEqual(models[0].properties[0].serializationOptions.json?.name, "id");
  });

  it("default output json serialization option", async function () {
    await runner.compileWithBuiltInService(`
      model Blob {
        id: string;
      }

      op test(): Blob;
    `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].serializationOptions.json?.name, "Blob");
    strictEqual(models[0].properties[0].kind, "property");
    strictEqual(models[0].properties[0].serializationOptions.json?.name, "id");
  });

  it("json serialization with @encodedName", async () => {
    await runner.compileWithBuiltInService(`
      model Blob {
        @encodedName("application/json", "newId")
        id: string;
      }

      op test(): Blob;
    `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].serializationOptions.json?.name, "Blob");
    strictEqual(models[0].properties[0].kind, "property");
    strictEqual(models[0].properties[0].serializationOptions.json?.name, "newId");
  });

  it("@attribute", async function () {
    runner = await createSdkTestRunner({
      librariesToAdd: [XmlTestLibrary],
      autoUsings: ["TypeSpec.Xml"],
    });

    await runner.compileWithBuiltInService(`
      model Blob {
        @attribute id: string;
      }

      op test(): Blob;
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].properties[0].decorators, [
      {
        name: "TypeSpec.Xml.@attribute",
        arguments: {},
      },
    ]);
  });

  it("@name", async function () {
    runner = await createSdkTestRunner({
      librariesToAdd: [XmlTestLibrary],
      autoUsings: ["TypeSpec.Xml"],
    });

    await runner.compileWithBuiltInService(`
      @name("XmlBook")
      model Book {
        @name("XmlId") id: string;
        content: string;
      }

      op test(): Book;
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].decorators, [
      {
        name: "TypeSpec.Xml.@name",
        arguments: { name: "XmlBook" },
      },
    ]);
    deepStrictEqual(models[0].properties[0].decorators, [
      {
        name: "TypeSpec.Xml.@name",
        arguments: { name: "XmlId" },
      },
    ]);
  });

  it("@ns", async function () {
    runner = await createSdkTestRunner({
      librariesToAdd: [XmlTestLibrary],
      autoUsings: ["TypeSpec.Xml"],
    });

    await runner.compileWithBuiltInService(`
      @ns("https://example.com/ns1", "ns1")
      model Foo {
        @ns("https://example.com/ns1", "ns1")
        bar1: string;
      
        @ns("https://example.com/ns2", "ns2")
        bar2: string;
      }

      op test(): Foo;
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].decorators, [
      {
        name: "TypeSpec.Xml.@ns",
        arguments: {
          ns: "https://example.com/ns1",
          prefix: "ns1",
        },
      },
    ]);
    deepStrictEqual(models[0].properties[0].decorators, [
      {
        name: "TypeSpec.Xml.@ns",
        arguments: {
          ns: "https://example.com/ns1",
          prefix: "ns1",
        },
      },
    ]);
    deepStrictEqual(models[0].properties[1].decorators, [
      {
        name: "TypeSpec.Xml.@ns",
        arguments: {
          ns: "https://example.com/ns2",
          prefix: "ns2",
        },
      },
    ]);
  });

  it("@nsDeclarations", async function () {
    runner = await createSdkTestRunner({
      librariesToAdd: [XmlTestLibrary],
      autoUsings: ["TypeSpec.Xml"],
    });

    await runner.compileWithBuiltInService(`
      @Xml.nsDeclarations
      enum Namespaces {
        ns1: "https://example.com/ns1",
        ns2: "https://example.com/ns2",
      }
      
      @Xml.ns(Namespaces.ns1)
      model Foo {
        @Xml.ns(Namespaces.ns1)
        bar1: string;
      
        @Xml.ns(Namespaces.ns2)
        bar2: string;
      }

      op test(): Foo;
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].decorators[0].name, "TypeSpec.Xml.@ns");
    const modelArg = models[0].decorators[0].arguments["ns"] as SdkEnumValueType;
    strictEqual(modelArg.value, "https://example.com/ns1");

    strictEqual(models[0].properties[0].decorators[0].name, "TypeSpec.Xml.@ns");
    let propArg = models[0].properties[0].decorators[0].arguments["ns"] as SdkEnumValueType;
    strictEqual(propArg.value, "https://example.com/ns1");

    strictEqual(models[0].properties[1].decorators[0].name, "TypeSpec.Xml.@ns");
    propArg = models[0].properties[1].decorators[0].arguments["ns"] as SdkEnumValueType;
    strictEqual(propArg.value, "https://example.com/ns2");
  });

  it("@unwrapped", async function () {
    runner = await createSdkTestRunner({
      librariesToAdd: [XmlTestLibrary],
      autoUsings: ["TypeSpec.Xml"],
    });

    await runner.compileWithBuiltInService(`
      model Pet {
        @unwrapped tags: string[];
      }

      op test(): Pet;
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].properties[0].decorators, [
      {
        name: "TypeSpec.Xml.@unwrapped",
        arguments: {},
      },
    ]);
  });
});
