import { resolvePath } from "@typespec/compiler";
import { createTester, expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { SdkEnumValueType } from "../../src/interfaces.js";
import {
  AzureCoreTester,
  createSdkContextForTester,
  TcgcTester,
} from "../tester.js";

/**
 * Tester for TCGC tests with XML library support.
 */
const XmlTester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/xml",
    "@azure-tools/typespec-client-generator-core",
  ],
})
  .import(
    "@typespec/http",
    "@typespec/rest",
    "@typespec/versioning",
    "@typespec/xml",
    "@azure-tools/typespec-client-generator-core",
  )
  .using("Http", "Rest", "Versioning", "Xml", "Azure.ClientGenerator.Core");

/**
 * Tester with a built-in simple service namespace and XML support.
 */
const XmlTesterWithBuiltInService = XmlTester.wrap(
  (x) => `
@service
namespace TestService;

${x}
`,
);

/**
 * Tester with Azure Core and a built-in service namespace.
 */
const AzureCoreServiceTester = AzureCoreTester.wrap(
  (x) => `
@service
namespace TestService;

${x}
`,
);

/**
 * Simple tester with built-in service for decorator listing tests.
 */
const SimpleTesterWithBuiltInServiceForDecorators = TcgcTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/versioning",
  "@azure-tools/typespec-client-generator-core",
)
  .using("Http", "Rest", "Versioning", "Azure.ClientGenerator.Core")
  .wrap(
    (x) => `
@service(#{title: "Test Service"})
namespace TestService;

${x}
`,
  );
it("no arg", async function () {
  const { program } = await SimpleTesterWithBuiltInServiceForDecorators.compile(`
    @error
    model Blob {
      id: string;
    }

    op test(): Blob;
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-java" },
    { additionalDecorators: ["TypeSpec\\.@error"] },
  );

  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  deepStrictEqual(models[0].decorators, [{ name: "TypeSpec.@error", arguments: {} }]);
  expectDiagnostics(context.diagnostics, []);
});

it("basic arg type", async function () {
  const { program } = await SimpleTesterWithBuiltInServiceForDecorators.compile(`
    model Blob {
      @clientName("ID")
      id: string;
    }

    op test(): Blob;
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-java" },
    { additionalDecorators: ["Azure\\.ClientGenerator\\.Core\\.@clientName"] },
  );

  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  deepStrictEqual(models[0].properties[0].decorators, [
    {
      name: "Azure.ClientGenerator.Core.@clientName",
      arguments: {
        rename: "ID",
      },
    },
  ]);
  expectDiagnostics(context.diagnostics, []);
});

it("enum member arg type", async function () {
  const { program } = await SimpleTesterWithBuiltInServiceForDecorators.compile(`
    model Blob {
      @encode(BytesKnownEncoding.base64url)
      value: bytes;
    }

    op test(): Blob;
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-java" },
    { additionalDecorators: ["TypeSpec\\.@encode"] },
  );

  const models = context.sdkPackage.models;
  strictEqual(models.length, 1);
  strictEqual(models[0].properties[0].decorators[0].name, "TypeSpec.@encode");
  const encodeInfo = models[0].properties[0].decorators[0].arguments[
    "encodingOrEncodeAs"
  ] as SdkEnumValueType;
  strictEqual((encodeInfo.value as any).value, "base64url");
  expectDiagnostics(context.diagnostics, []);
});

// This is not valid anymore as its getting value objects
it.skip("decorator arg type not supported", async function () {
  const { program } = await SimpleTesterWithBuiltInServiceForDecorators.compile(`
    op test(): void;
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-java" },
    { additionalDecorators: ["TypeSpec\\.@service"] },
  );

  deepStrictEqual(context.sdkPackage.clients[0].decorators, [
    {
      name: "TypeSpec.@service",
      arguments: { options: undefined },
    },
  ]);
  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/unsupported-generic-decorator-arg-type",
  });
});

it("multiple same decorators", async function () {
  const { program } = await SimpleTesterWithBuiltInServiceForDecorators.compile(`
    @clientName("testForPython", "python")
    @clientName("testForJava", "java")
    op test(): void;
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-java" },
    { additionalDecorators: ["Azure\\.ClientGenerator\\.Core\\.@clientName"] },
  );

  deepStrictEqual(context.sdkPackage.clients[0].methods[0].decorators, [
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
  expectDiagnostics(context.diagnostics, []);
});

it("decorators on a namespace", async function () {
  const { program } = await SimpleTesterWithBuiltInServiceForDecorators.compile(`
    op test(): void;
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-java" },
    { additionalDecorators: ["TypeSpec\\.@service"] },
  );

  const sdkPackage = context.sdkPackage;
  const namespace = sdkPackage.namespaces[0];
  ok(namespace);
  strictEqual(namespace.name, "TestService");
  strictEqual(namespace.__raw?.kind, "Namespace");
  strictEqual(namespace.decorators.length, 1);
  deepStrictEqual(namespace.decorators, [
    {
      name: "TypeSpec.@service",
      arguments: {
        options: {
          title: "Test Service",
        },
      },
    },
  ]);
  expectDiagnostics(context.diagnostics, []);
});

describe("xml scenario", () => {
  it("@attribute", async function () {
    const { program } = await XmlTesterWithBuiltInService.compile(`
      model Blob {
        @attribute id: string;
      }

      op test(): Blob;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    const models = context.sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].properties[0].decorators, [
      {
        name: "TypeSpec.Xml.@attribute",
        arguments: {},
      },
    ]);
  });

  it("@name", async function () {
    const { program } = await XmlTesterWithBuiltInService.compile(`
      @name("XmlBook")
      model Book {
        @name("XmlId") id: string;
        content: string;
      }

      op test(): Book;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    const models = context.sdkPackage.models;
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
    const { program } = await XmlTesterWithBuiltInService.compile(`
      @ns("https://example.com/ns1", "ns1")
      model Foo {
        @ns("https://example.com/ns1", "ns1")
        bar1: string;
      
        @ns("https://example.com/ns2", "ns2")
        bar2: string;
      }

      op test(): Foo;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    const models = context.sdkPackage.models;
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
    const { program } = await XmlTesterWithBuiltInService.compile(`
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

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    const models = context.sdkPackage.models;
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
    const { program } = await XmlTesterWithBuiltInService.compile(`
      model Pet {
        @unwrapped tags: string[];
      }

      op test(): Pet;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    const models = context.sdkPackage.models;
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
    const { program } = await AzureCoreServiceTester.compile(`
      @useFinalStateVia("original-uri")
      @put
      op test(): void;
    `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-java",
    });

    const methods = context.sdkPackage.clients[0].methods;
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
  it("@useSystemTextJsonConverter", async function () {
    const { program } = await SimpleTesterWithBuiltInServiceForDecorators.compile(`
        @useSystemTextJsonConverter("csharp")
        model A {
          id: string;
        }

        op test(): A;
      `);

    const context = await createSdkContextForTester(
      program,
      { emitterName: "@azure-tools/typespec-java" },
      { additionalDecorators: ["Azure\\.ClientGenerator\\.Core\\.@useSystemTextJsonConverter"] },
    );

    const models = context.sdkPackage.models;
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].decorators, [
      {
        name: "Azure.ClientGenerator.Core.@useSystemTextJsonConverter",
        arguments: { scope: "csharp" },
      },
    ]);
    expectDiagnostics(context.diagnostics, []);
  });
});
