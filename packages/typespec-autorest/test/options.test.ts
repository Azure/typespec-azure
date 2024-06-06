import { resolvePath } from "@typespec/compiler";
import {
  BasicTestRunner,
  expectDiagnosticEmpty,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { AutorestEmitterOptions } from "../src/lib.js";
import { OpenAPI2Document } from "../src/openapi2-document.js";
import { createAutorestTestRunner, ignoreDiagnostics } from "./test-host.js";

async function openapiWithOptions(
  code: string,
  options: AutorestEmitterOptions
): Promise<OpenAPI2Document> {
  const runner = await createAutorestTestRunner();

  const outPath = resolvePath("/openapi.json");

  const diagnostics = await runner.diagnose(code, {
    noEmit: false,
    emitters: { "@azure-tools/typespec-autorest": { ...options, "output-file": outPath } },
  });

  expectDiagnosticEmpty(diagnostics.filter((x) => x.code !== "@typespec/http/no-service-found"));

  const content = runner.fs.get(outPath)!;
  return JSON.parse(content);
}

describe("typespec-autorest: options", () => {
  let runner: BasicTestRunner;
  beforeEach(async () => {
    runner = await createAutorestTestRunner();
  });

  describe("'new-line' option", () => {
    async function rawOpenApiFor(code: string, options: AutorestEmitterOptions): Promise<string> {
      const outPath = resolvePath("/openapi.json");

      const diagnostics = await runner.diagnose(code, {
        noEmit: false,
        emitters: { "@azure-tools/typespec-autorest": { ...options, "output-file": outPath } },
      });

      expectDiagnosticEmpty(
        ignoreDiagnostics(diagnostics, [
          "@typespec/http/no-service-found",
          "@azure-tools/typespec-azure-core/use-standard-operations",
        ])
      );

      return runner.fs.get(outPath)!;
    }

    // Content of an empty spec
    const expectedEmptySpec = [
      "{",
      `  "swagger": "2.0",`,
      `  "info": {`,
      `    "title": "(title)",`,
      `    "version": "0000-00-00",`,
      `    "x-typespec-generated": [`,
      `      {`,
      `        "emitter": "@azure-tools/typespec-autorest"`,
      `      }`,
      `    ]`,
      `  },`,
      `  "schemes": [`,
      `    "https"`,
      `  ],`,
      `  "produces": [`,
      `    "application/json"`,
      `  ],`,
      `  "consumes": [`,
      `    "application/json"`,
      `  ],`,
      `  "tags": [],`,
      `  "paths": {},`,
      `  "definitions": {},`,
      `  "parameters": {}`,
      "}",
      "",
    ];

    it("emit LF line endings by default", async () => {
      const output = await rawOpenApiFor("", {});
      strictEqual(output, expectedEmptySpec.join("\n"));
    });

    it("emit CRLF when configured", async () => {
      const output = await rawOpenApiFor("", { "new-line": "crlf" });
      strictEqual(output, expectedEmptySpec.join("\r\n"));
    });
  });

  describe("'output-file' option", () => {
    const emitterOutputDir = resolveVirtualPath("./my-output");
    it("emit to {emitter-output-dir}/openapi.json if not provided", async () => {
      await runner.compile(
        `
        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
        op test(): void;`,
        {
          noEmit: false,
          emitters: {
            "@azure-tools/typespec-autorest": { "emitter-output-dir": emitterOutputDir },
          },
        }
      );
      ok(runner.fs.has(resolvePath(emitterOutputDir, "openapi.json")));
    });

    it("emit to {emitter-output-dir}/{output-file} if provided", async () => {
      await runner.compile(
        `
        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
        op test(): void;`,
        {
          noEmit: false,
          outputPath: "./my-output",
          emitters: {
            "@azure-tools/typespec-autorest": {
              "emitter-output-dir": emitterOutputDir,
            },
          },
        }
      );
      ok(runner.fs.has(resolveVirtualPath("./my-output/openapi.json")));
    });

    it("emit to {emitter-output-dir}/{version}/{output-file} if spec contains versioning", async () => {
      const versionedRunner = await createAutorestTestRunner();
      await versionedRunner.compile(
        `
@TypeSpec.Versioning.versioned(Versions)
@service({title: "Widget Service"})
namespace DemoService;
enum Versions {v1, v2}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
op test(): void;
      `,
        {
          noEmit: false,
          outputPath: "./my-output",
          emitters: {
            "@azure-tools/typespec-autorest": {
              "emitter-output-dir": emitterOutputDir,
            },
          },
        }
      );
      ok(
        !versionedRunner.fs.has(resolveVirtualPath("./my-output/openapi.json")),
        "Shouldn't have created the non versioned file name"
      );
      ok(versionedRunner.fs.has(resolveVirtualPath("./my-output/v1/openapi.json")));
      ok(versionedRunner.fs.has(resolveVirtualPath("./my-output/v2/openapi.json")));
    });

    it("emit to {emitter-output-dir}/{arm-folder}/{serviceName}/{versionType}/{version}/{output-file} if spec contains azure-resource-provider-folder is passed", async () => {
      const versionedRunner = await createAutorestTestRunner();
      await versionedRunner.compile(
        `
@TypeSpec.Versioning.versioned(Versions)
@service({title: "Widget Service"})
namespace TestService;
enum Versions {v1, "v2-preview"}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
op test(): void;
      `,
        {
          noEmit: false,
          outputPath: "./my-output",
          emitters: {
            "@azure-tools/typespec-autorest": {
              "emitter-output-dir": emitterOutputDir,
              "azure-resource-provider-folder": "./arm-folder",
            },
          },
        }
      );

      ok(
        versionedRunner.fs.has(
          resolveVirtualPath("./my-output/arm-folder/TestService/stable/v1/openapi.json")
        )
      );
      ok(
        versionedRunner.fs.has(
          resolveVirtualPath("./my-output/arm-folder/TestService/preview/v2-preview/openapi.json")
        )
      );
    });
  });

  describe("omit-unreachable-types", () => {
    it("emit unreferenced types by default", async () => {
      const output = await openapiWithOptions(
        `
        model NotReferenced {name: string}
        model Referenced {name: string}
        op test(): Referenced;
      `,
        {}
      );
      deepStrictEqual(Object.keys(output.definitions!), ["NotReferenced", "Referenced"]);
    });

    it("emit only referenced types when using omit-unreachable-types", async () => {
      const output = await openapiWithOptions(
        `
        model NotReferenced {name: string}
        model Referenced {name: string}
        op test(): Referenced;
      `,
        {
          "omit-unreachable-types": true,
        }
      );
      deepStrictEqual(Object.keys(output.definitions!), ["Referenced"]);
    });
  });

  describe("version-enum-strategy", () => {
    const code = `
      @service
      @versioned(Versions)
      namespace My {
        enum Versions {v1, v2}
        model NotReferenced {}
      }
    `;
    it("doesn't include version enum by default", async () => {
      const output = await openapiWithOptions(code, {});
      deepStrictEqual(Object.keys(output.definitions!), ["NotReferenced"]);
    });

    it("include version enum when set to 'include'", async () => {
      const output = await openapiWithOptions(code, {
        "version-enum-strategy": "include",
      });
      deepStrictEqual(Object.keys(output.definitions!), ["NotReferenced", "Versions"]);
    });

    it("doesn't omit other enums", async () => {
      const output = await openapiWithOptions(
        `@service
        @versioned(Versions)
        namespace My {
          enum Versions {v1, v2}
          enum NotReferenced {a, b}
        }`,
        {}
      );
      deepStrictEqual(Object.keys(output.definitions!), ["NotReferenced"]);
    });
  });

  describe("include-x-typespec-name", () => {
    it("doesn't include x-typespec-name by default", async () => {
      const output = await openapiWithOptions(
        `
        model Foo {names: string[]}
      `,
        {}
      );
      ok(!("x-typespec-name" in output.definitions!.Foo.properties!.names));
    });

    it(`doesn't include x-typespec-name when option include-x-typespec-name: "never"`, async () => {
      const output = await openapiWithOptions(
        `
        model Foo {names: string[]}
      `,
        { "include-x-typespec-name": "never" }
      );
      ok(!("x-typespec-name" in output.definitions!.Foo.properties!.names));
    });

    it(`include x-typespec-name when option include-x-typespec-name: "inline-only"`, async () => {
      const output = await openapiWithOptions(
        `
        model Foo {names: string[]}
      `,
        { "include-x-typespec-name": "inline-only" }
      );
      const prop: any = output.definitions!.Foo.properties!.names;
      strictEqual(prop["x-typespec-name"], `string[]`);
    });
  });

  describe("'suppress-lro-options' option", () => {
    const lroCode = `
      @armProviderNamespace
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       Succeeded,
       Canceled,
       Failed
     }

      @doc("The widget properties")
      model WidgetProperties {
        @doc("I am a simple Resource Identifier")
        simpleArmId: Azure.Core.armResourceIdentifier;

        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model Widget is TrackedResource<WidgetProperties> {
        @doc("Widget name")
        @key("widgetName")
        @segment("widgets")
        @path
        name: string;
      }
      @armResourceOperations(Widget)
      interface Widgets {
        get is ArmResourceRead<Widget>;
        @Azure.Core.useFinalStateVia("azure-async-operation")
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget, LroHeaders = Azure.Core.Foundations.RetryAfterHeader & ArmAsyncOperationHeader>;
        update is ArmResourcePatchSync<Widget, WidgetProperties>;
        delete is ArmResourceDeleteSync<Widget>;
        listByResourceGroup is ArmResourceListByParent<Widget>;
        listBySubscription is ArmListBySubscription<Widget>;
      }
      `;

    it("emit x-ms-long-running-operation-options by default", async () => {
      const output = await openapiWithOptions(lroCode, {});
      const itemPath =
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
      ok(output.paths[itemPath]);
      ok(output.paths[itemPath].put);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation"], true);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation-options"], {
        "final-state-via": "azure-async-operation",
        "final-state-schema": "#/definitions/Widget",
      });
    });

    it("suppress x-ms-long-running operation options when configured", async () => {
      const output = await openapiWithOptions(lroCode, { "suppress-lro-options": true });
      const itemPath =
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
      ok(output.paths[itemPath]);
      ok(output.paths[itemPath].put);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation"], true);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation-options"], undefined);
    });
  });
});
