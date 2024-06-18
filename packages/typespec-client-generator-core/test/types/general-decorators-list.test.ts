import { XmlTestLibrary } from "@typespec/xml/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: general decorators list", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  it("no arg", async function () {
    runner = await createSdkTestRunner({}, { decoratorsWhiteList: ["TypeSpec\\.@error"] });

    await runner.compileWithBuiltInService(`
      @error
      model Blob {
        id: string;
      }

      op test(): Blob;
    `);

    const models = runner.context.experimental_sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].decorators["TypeSpec.@error"], {});
  });

  it("basic arg type", async function () {
    runner = await createSdkTestRunner(
      {},
      { decoratorsWhiteList: ["Azure\\.ClientGenerator\\.Core\\.@clientName"] }
    );

    await runner.compileWithBuiltInService(`
      model Blob {
        @clientName("ID")
        id: string;
      }

      op test(): Blob;
    `);

    const models = runner.context.experimental_sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].properties[0].decorators["Azure.ClientGenerator.Core.@clientName"], {
      rename: "ID",
    });
  });

  it("enum member arg type", async function () {
    runner = await createSdkTestRunner({}, { decoratorsWhiteList: ["TypeSpec\\.@encode"] });

    await runner.compileWithBuiltInService(`
      model Blob {
        @encode(BytesKnownEncoding.base64url)
        value: bytes;
      }

      op test(): Blob;
    `);

    const models = runner.context.experimental_sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].properties[0].decorators["TypeSpec.@encode"], {
      encoding: "base64url",
    });
  });

  describe("xml scenario", () => {
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

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      deepStrictEqual(models[0].properties[0].decorators["TypeSpec.Xml.@attribute"], {});
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

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      deepStrictEqual(models[0].decorators["TypeSpec.Xml.@name"], { name: "XmlBook" });
      deepStrictEqual(models[0].properties[0].decorators["TypeSpec.Xml.@name"], { name: "XmlId" });
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

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      deepStrictEqual(models[0].decorators["TypeSpec.Xml.@ns"], {
        ns: "https://example.com/ns1",
        prefix: "ns1",
      });
      deepStrictEqual(models[0].properties[0].decorators["TypeSpec.Xml.@ns"], {
        ns: "https://example.com/ns1",
        prefix: "ns1",
      });
      deepStrictEqual(models[0].properties[1].decorators["TypeSpec.Xml.@ns"], {
        ns: "https://example.com/ns2",
        prefix: "ns2",
      });
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

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      deepStrictEqual(models[0].decorators["TypeSpec.Xml.@ns"], {
        ns: "https://example.com/ns1",
      });
      deepStrictEqual(models[0].properties[0].decorators["TypeSpec.Xml.@ns"], {
        ns: "https://example.com/ns1",
      });
      deepStrictEqual(models[0].properties[1].decorators["TypeSpec.Xml.@ns"], {
        ns: "https://example.com/ns2",
      });
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

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      deepStrictEqual(models[0].properties[0].decorators["TypeSpec.Xml.@unwrapped"], {});
    });
  });
});
