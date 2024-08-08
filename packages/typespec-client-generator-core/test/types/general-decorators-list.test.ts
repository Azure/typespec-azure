import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { XmlTestLibrary } from "@typespec/xml/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkEnumValueType } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: general decorators list", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  it("no arg", async function () {
    runner = await createSdkTestRunner({}, { additionalDecorators: ["TypeSpec\\.@error"] });

    await runner.compileWithBuiltInService(`
      @error
      model Blob {
        id: string;
      }

      op test(): Blob;
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].decorators, [{ name: "TypeSpec.@error", arguments: {} }]);
    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("basic arg type", async function () {
    runner = await createSdkTestRunner(
      {},
      { additionalDecorators: ["Azure\\.ClientGenerator\\.Core\\.@clientName"] }
    );

    await runner.compileWithBuiltInService(`
      model Blob {
        @clientName("ID")
        id: string;
      }

      op test(): Blob;
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].properties[0].decorators, [
      {
        name: "Azure.ClientGenerator.Core.@clientName",
        arguments: {
          rename: "ID",
        },
      },
    ]);
    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("enum member arg type", async function () {
    runner = await createSdkTestRunner({}, { additionalDecorators: ["TypeSpec\\.@encode"] });

    await runner.compileWithBuiltInService(`
      model Blob {
        @encode(BytesKnownEncoding.base64url)
        value: bytes;
      }

      op test(): Blob;
    `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].properties[0].decorators[0].name, "TypeSpec.@encode");
    const encodeInfo = models[0].properties[0].decorators[0].arguments[
      "encodingOrEncodeAs"
    ] as SdkEnumValueType;
    strictEqual((encodeInfo.value as any).value, "base64url");
    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("decorator arg type not supported", async function () {
    runner = await createSdkTestRunner({}, { additionalDecorators: ["TypeSpec\\.@service"] });

    await runner.compileWithBuiltInService(`
      op test(): void;
    `);

    deepStrictEqual(runner.context.sdkPackage.clients[0].decorators, [
      {
        name: "TypeSpec.@service",
        arguments: { options: undefined },
      },
    ]);
    expectDiagnostics(runner.context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/unsupported-generic-decorator-arg-type",
    });
  });

  it("multiple same decorators", async function () {
    runner = await createSdkTestRunner(
      {},
      { additionalDecorators: ["Azure\\.ClientGenerator\\.Core\\.@clientName"] }
    );

    await runner.compileWithBuiltInService(`
      @clientName("testForPython", "python")
      @clientName("testForJava", "java")
      op test(): void;
    `);

    deepStrictEqual(runner.context.sdkPackage.clients[0].methods[0].decorators, [
      {
        name: "Azure.ClientGenerator.Core.@clientName",
        arguments: {
          rename: "testForJava",
          scope: "java",
        },
      },
      {
        name: "Azure.ClientGenerator.Core.@clientName",
        arguments: {
          rename: "testForPython",
          scope: "python",
        },
      },
    ]);
    expectDiagnostics(runner.context.diagnostics, []);
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

  describe("azure scenario", () => {
    it("@useFinalStateVia", async function () {
      runner = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
      });

      await runner.compileWithBuiltInService(`
      @useFinalStateVia("original-uri")
      @put
      op test(): void;
    `);

      const methods = runner.context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 1);
      deepStrictEqual(methods[0].decorators, [
        {
          name: "Azure.Core.@useFinalStateVia",
          arguments: {
            finalState: "original-uri",
          },
        },
      ]);
    });
  });

  describe("csharp only decorator", () => {
    it("@hasJsonConverter", async function () {
      runner = await createSdkTestRunner(
        {},
        { additionalDecorators: ["Azure\\.ClientGenerator\\.Core\\.CSharp\\.@hasJsonConverter"] }
      );

      await runner.compileWithBuiltInService(`
        @hasJsonConverter("csharp")
        model A {
          id: string;
        }

        op test(): A;
      `);

      const models = runner.context.sdkPackage.models;
      strictEqual(models.length, 1);
      deepStrictEqual(models[0].decorators, [
        { name: "Azure.ClientGenerator.Core.CSharp.@hasJsonConverter", arguments: {} },
      ]);
      expectDiagnostics(runner.context.diagnostics, []);
    });
  });
});
