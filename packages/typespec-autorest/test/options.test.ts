import { resolvePath } from "@typespec/compiler";
import {
  EmitterTesterInstance,
  expectDiagnosticEmpty,
  expectDiagnostics,
  resolveVirtualPath,
  TestEmitterCompileResult,
} from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { AutorestEmitterOptions } from "../src/lib.js";
import { ApiTester, compileOpenAPI, ignoreDiagnostics, Tester } from "./test-host.js";

let runner: EmitterTesterInstance<TestEmitterCompileResult>;

beforeEach(async () => {
  runner = await Tester.createInstance();
});

function compileOpenAPIWithOptions(code: string, options: AutorestEmitterOptions) {
  return compileOpenAPI(code, {
    options: { ...options, "output-file": "openapi.json" },
    preset: "azure",
  });
}

describe("typespec-autorest: options", () => {
  describe("'new-line' option", () => {
    async function rawOpenApiFor(code: string, options: AutorestEmitterOptions): Promise<string> {
      const [{ outputs }, diagnostics] = await runner.compileAndDiagnose(code, {
        compilerOptions: {
          options: {
            "@azure-tools/typespec-autorest": { ...options },
          },
        },
      });

      expectDiagnosticEmpty(
        ignoreDiagnostics(diagnostics, [
          "@typespec/http/no-service-found",
          "@azure-tools/typespec-azure-core/use-standard-operations",
        ]),
      );

      return outputs["openapi.json"];
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
          compilerOptions: {
            options: {
              "@azure-tools/typespec-autorest": { "emitter-output-dir": emitterOutputDir },
            },
          },
        },
      );
      ok(runner.fs.fs.has(resolvePath(emitterOutputDir, "openapi.json")));
    });

    it("emit to {emitter-output-dir}/{output-file} if provided", async () => {
      await runner.compile(
        `
        #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
        op test(): void;`,
        {
          compilerOptions: {
            outputDir: "./my-output",
            options: {
              "@azure-tools/typespec-autorest": {
                "emitter-output-dir": emitterOutputDir,
              },
            },
          },
        },
      );
      ok(runner.fs.fs.has(resolveVirtualPath("./my-output/openapi.json")));
    });

    it("emit to {emitter-output-dir}/{version}/{output-file} if spec contains versioning", async () => {
      const versionedRunner = await Tester.createInstance();
      await versionedRunner.compile(
        `
@TypeSpec.Versioning.versioned(Versions)
@service(#{title: "Widget Service"})
namespace DemoService;
enum Versions {v1, v2}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
op test(): void;
      `,
        {
          compilerOptions: {
            outputDir: "./my-output",
            options: {
              "@azure-tools/typespec-autorest": {
                "emitter-output-dir": emitterOutputDir,
              },
            },
          },
        },
      );
      ok(
        !versionedRunner.fs.fs.has(resolveVirtualPath("./my-output/openapi.json")),
        "Shouldn't have created the non versioned file name",
      );
      ok(versionedRunner.fs.fs.has(resolveVirtualPath("./my-output/v1/openapi.json")));
      ok(versionedRunner.fs.fs.has(resolveVirtualPath("./my-output/v2/openapi.json")));
    });

    it("emit to {emitter-output-dir}/{arm-folder}/{serviceName}/{versionType}/{version}/{output-file} if spec contains azure-resource-provider-folder is passed", async () => {
      const versionedRunner = await Tester.createInstance();
      await versionedRunner.compile(
        `
@TypeSpec.Versioning.versioned(Versions)
@service(#{title: "Widget Service"})
namespace TestService;
enum Versions {v1, "v2-preview"}

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
op test(): void;
      `,
        {
          compilerOptions: {
            outputDir: "./my-output",
            options: {
              "@azure-tools/typespec-autorest": {
                "emitter-output-dir": emitterOutputDir,
                "azure-resource-provider-folder": "./arm-folder",
              },
            },
          },
        },
      );

      ok(
        versionedRunner.fs.fs.has(
          resolveVirtualPath("./my-output/arm-folder/TestService/stable/v1/openapi.json"),
        ),
      );
      ok(
        versionedRunner.fs.fs.has(
          resolveVirtualPath("./my-output/arm-folder/TestService/preview/v2-preview/openapi.json"),
        ),
      );
    });
  });

  describe("omit-unreachable-types", () => {
    it("emit unreferenced types by default", async () => {
      const output = await compileOpenAPIWithOptions(
        `
        model NotReferenced {name: string}
        model Referenced {name: string}
        op test(): Referenced;
      `,
        {},
      );
      deepStrictEqual(Object.keys(output.definitions!), ["NotReferenced", "Referenced"]);
    });

    it("emit only referenced types when using omit-unreachable-types", async () => {
      const output = await compileOpenAPIWithOptions(
        `
        model NotReferenced {name: string}
        model Referenced {name: string}
        op test(): Referenced;
      `,
        {
          "omit-unreachable-types": true,
        },
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
      const output = await compileOpenAPIWithOptions(code, {});
      deepStrictEqual(Object.keys(output.definitions!), ["NotReferenced"]);
    });

    it("include version enum when set to 'include'", async () => {
      const output = await compileOpenAPIWithOptions(code, {
        "version-enum-strategy": "include",
      });
      deepStrictEqual(Object.keys(output.definitions!), ["NotReferenced", "Versions"]);
    });

    it("doesn't omit other enums", async () => {
      const output = await compileOpenAPIWithOptions(
        `@service
        @versioned(Versions)
        namespace My {
          enum Versions {v1, v2}
          enum NotReferenced {a, b}
        }`,
        {},
      );
      deepStrictEqual(Object.keys(output.definitions!), ["NotReferenced"]);
    });
  });

  describe("include-x-typespec-name", () => {
    it("doesn't include x-typespec-name by default", async () => {
      const output = await compileOpenAPIWithOptions(
        `
        model Foo {names: string[]}
      `,
        {},
      );
      ok(!("x-typespec-name" in output.definitions!.Foo.properties!.names));
    });

    it(`doesn't include x-typespec-name when option include-x-typespec-name: "never"`, async () => {
      const output = await compileOpenAPIWithOptions(
        `
        model Foo {names: string[]}
      `,
        { "include-x-typespec-name": "never" },
      );
      ok(!("x-typespec-name" in output.definitions!.Foo.properties!.names));
    });

    it(`include x-typespec-name when option include-x-typespec-name: "inline-only"`, async () => {
      const output = await compileOpenAPIWithOptions(
        `
        model Foo {names: string[]}
      `,
        { "include-x-typespec-name": "inline-only" },
      );
      const prop: any = output.definitions!.Foo.properties!.names;
      strictEqual(prop["x-typespec-name"], `string[]`);
    });
  });

  describe("'emit-lro-options' option", () => {
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

    it("emits all x-ms-long-running-operation-options", async () => {
      const output = await compileOpenAPIWithOptions(lroCode, { "emit-lro-options": "all" });
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

    it("emits final-state-via by default", async () => {
      const output = await compileOpenAPIWithOptions(lroCode, {});
      const itemPath =
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
      ok(output.paths[itemPath]);
      ok(output.paths[itemPath].put);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation"], true);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation-options"], {
        "final-state-via": "azure-async-operation",
      });
    });

    it("emits final-state-via when configured", async () => {
      const output = await compileOpenAPIWithOptions(lroCode, {
        "emit-lro-options": "final-state-only",
      });
      const itemPath =
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
      ok(output.paths[itemPath]);
      ok(output.paths[itemPath].put);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation"], true);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation-options"], {
        "final-state-via": "azure-async-operation",
      });
    });

    it("suppress x-ms-long-running operation options when configured", async () => {
      const output = await compileOpenAPIWithOptions(lroCode, { "emit-lro-options": "none" });
      const itemPath =
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
      ok(output.paths[itemPath]);
      ok(output.paths[itemPath].put);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation"], true);
      deepStrictEqual(output.paths[itemPath].put["x-ms-long-running-operation-options"], undefined);
    });
  });

  describe("'emit-common-types-schema' option", () => {
    const commonTypesFolder = resolveVirtualPath("/common-types/resource-management");
    const commonTypesPath = "../../common-types/resource-management/v3/types.json";
    const commonCode = `
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

    it("emits only schema references with 'never' setting", async () => {
      const output = await compileOpenAPIWithOptions(commonCode, {
        "emit-common-types-schema": "never",
        "arm-types-dir": commonTypesFolder,
      });
      ok(output.definitions);
      ok(output.definitions["WidgetUpdate"]);
      deepStrictEqual(output.definitions["WidgetUpdate"].allOf, [
        {
          $ref: `${commonTypesPath}#/definitions/TrackedResource`,
        },
      ]);
    });

    it("emits an update schema for TrackedResource by default", async () => {
      const output = await compileOpenAPIWithOptions(commonCode, {
        "arm-types-dir": commonTypesFolder,
      });
      ok(output.definitions);
      ok(output.definitions["WidgetUpdate"]);
      deepStrictEqual(output.definitions["WidgetUpdate"].allOf, [
        {
          $ref: `#/definitions/Azure.ResourceManager.CommonTypes.TrackedResourceUpdate`,
        },
      ]);
    });

    it("emits update schema when set to `for-visibility-changes`", async () => {
      const output = await compileOpenAPIWithOptions(commonCode, {
        "emit-common-types-schema": "for-visibility-changes",
        "arm-types-dir": commonTypesFolder,
      });
      ok(output.definitions);
      ok(output.definitions["WidgetUpdate"]);
      deepStrictEqual(output.definitions["WidgetUpdate"].allOf, [
        {
          $ref: `#/definitions/Azure.ResourceManager.CommonTypes.TrackedResourceUpdate`,
        },
      ]);
    });
  });

  describe("'examples-dir'", () => {
    it("emit diagnostic if examples-dir is not absolute", async () => {
      const runner = await ApiTester.emit("@azure-tools/typespec-autorest", {
        "examples-dir": "./examples",
      });

      const diagnostics = await runner.diagnose("op test(): void;");
      expectDiagnostics(diagnostics, {
        code: "config-path-absolute",
      });
    });
  });
});
