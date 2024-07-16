import { getAsEmbeddingVector } from "@azure-tools/typespec-azure-core";
import { Model, Namespace, Scalar, resolvePath } from "@typespec/compiler";
import {
  BasicTestRunner,
  expectDiagnosticEmpty,
  expectDiagnostics,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { getRef } from "../src/decorators.js";
import { AutorestTestLibrary } from "../src/testing/index.js";
import {
  createAutorestTestHost,
  createAutorestTestRunner,
  ignoreDiagnostics,
  ignoreUseStandardOps,
  openApiFor,
} from "./test-host.js";

describe("typespec-autorest: decorators", () => {
  let runner: BasicTestRunner;

  beforeEach(async () => {
    runner = await createAutorestTestRunner();
  });

  describe("@embeddingVector", () => {
    it("returns embedding vector metadata for embedding vector models", async () => {
      const [result, _] = await runner.compileAndDiagnose(`
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      @test @service({title:"MyService"})
      namespace MyNamespace;

      model MyVector is EmbeddingVector<int64>;
      `);
      const ns = result["MyNamespace"] as Namespace;
      const model = ns.models.get("MyVector") as Model;
      const metadata = getAsEmbeddingVector(runner.program, model);
      deepStrictEqual((metadata!.elementType as Scalar).name, "int64");
    });

    it("returns undefined for non-embedding vector models", async () => {
      const [result, _] = await runner.compileAndDiagnose(`
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      @test @service({title:"MyService"})
      namespace MyNamespace;

      model Foo {};
      `);
      const ns = result["MyNamespace"] as Namespace;
      const model = ns.models.get("MyVector") as Model;
      const metadata = getAsEmbeddingVector(runner.program, model);
      strictEqual(metadata, undefined);
    });
  });

  describe("@useRef", () => {
    it("emit diagnostic if use on non model or property", async () => {
      const diagnostics = await runner.diagnose(`
        @useRef("foo")
        op foo(): string;
      `);

      expectDiagnostics(ignoreUseStandardOps(diagnostics), {
        code: "decorator-wrong-target",
        message:
          "Cannot apply @useRef decorator to foo since it is not assignable to Model | ModelProperty",
      });
    });

    it("emit diagnostic if ref is not a string", async () => {
      const diagnostics = await runner.diagnose(`
        @useRef(123)
        model Foo {}
      `);

      expectDiagnostics(ignoreUseStandardOps(diagnostics), {
        code: "invalid-argument",
      });
    });

    it("emit diagnostic if ref is not passed", async () => {
      const diagnostics = await runner.diagnose(`
        @useRef
        model Foo {}
      `);

      expectDiagnostics(ignoreUseStandardOps(diagnostics), [
        {
          code: "invalid-argument-count",
          message: "Expected 1 arguments, but got 0.",
        },
      ]);
    });

    it("set external reference", async () => {
      const [{ Foo }, diagnostics] = await runner.compileAndDiagnose(`
        @test @useRef("../common.json#/definitions/Foo")
        model Foo {}
      `);

      expectDiagnosticEmpty(
        ignoreDiagnostics(diagnostics, [
          "@azure-tools/typespec-azure-core/use-standard-operations",
          "@typespec/http/no-service-found",
        ])
      );

      strictEqual(getRef(runner.program, Foo), "../common.json#/definitions/Foo");
    });

    describe("interpolate arm-types-dir", () => {
      async function testArmTypesDir(options?: any) {
        const code = `
        @test @useRef("{arm-types-dir}/common.json#/definitions/Foo")
        model Foo {}

        model Bar {
          foo: Foo;
        }
      `;
        const runner = await createAutorestTestRunner();
        const outputDir = resolveVirtualPath(`specification/org/service/output`);
        const diagnostics = await runner.diagnose(code, {
          noEmit: false,
          config: resolveVirtualPath("specification/org/service/tspconfig.json"),
          emitters: {
            [AutorestTestLibrary.name]: {
              ...options,
              "emitter-output-dir": outputDir,
            },
          },
        });

        expectDiagnosticEmpty(
          ignoreDiagnostics(diagnostics, [
            "@azure-tools/typespec-azure-core/use-standard-operations",
            "@typespec/http/no-service-found",
          ])
        );

        const outPath = resolvePath(outputDir, "openapi.json");
        const openAPI = JSON.parse(runner.fs.get(outPath)!);
        return openAPI.definitions.Bar.properties.foo.$ref;
      }
      // project-root resolve to "" in test
      it("To ${project-root}../../ by default", async () => {
        const ref = await testArmTypesDir();
        strictEqual(ref, "../../../common-types/resource-management/common.json#/definitions/Foo");
      });

      it("configure a new absolute value", async () => {
        const ref = await testArmTypesDir({
          "arm-types-dir": "{project-root}/../other/path",
        });
        strictEqual(ref, "../../other/path/common.json#/definitions/Foo");
      });

      it("keeps relative value as it is", async () => {
        const ref = await testArmTypesDir({
          "arm-types-dir": "../other/path",
        });
        strictEqual(ref, "../other/path/common.json#/definitions/Foo");
      });
    });
  });
  describe("@operationId", () => {
    it("preserves casing of explicit @operationId decorator", async () => {
      const openapi = await openApiFor(`
        @get
        @operationId("Pets_GET")
        op read(): string;
      `);

      deepStrictEqual(openapi.paths["/"].get.operationId, "Pets_GET");
    });
  });
  describe("@example", () => {
    it("applies @example on operation", async () => {
      const diagnostics = await runner.diagnose(
        `
        model A {
          @Autorest.example("./someExample.json", "Some example")
          name: string;
        }
        `
      );

      expectDiagnostics(ignoreUseStandardOps(diagnostics), {
        code: "decorator-wrong-target",
        message:
          "Cannot apply @example decorator to (anonymous model).name since it is not assignable to Operation",
      });
    });

    it("adds an example to an operation", async () => {
      const openapi = await openApiFor(
        `
        model Pet {
          name: string;
        }

        @get
        @operationId("Pets_Get")
        @Autorest.example("./getPet.json", "Get a pet")
        op read(): Pet;
        `
      );

      deepStrictEqual(openapi.paths["/"].get["x-ms-examples"], {
        "Get a pet": {
          $ref: "./getPet.json",
        },
      });
    });

    it("adds multiple examples to an operation", async () => {
      const openapi = await openApiFor(
        `
        model Pet {
          name: string;
        }

        @get
        @operationId("Pets_Get")
        @Autorest.example("./getPet.json", "Get a pet")
        @Autorest.example("./getAnotherPet.json", "Get another pet")
        op read(): Pet;
        `
      );

      deepStrictEqual(openapi.paths["/"].get["x-ms-examples"], {
        "Get a pet": {
          $ref: "./getPet.json",
        },
        "Get another pet": {
          $ref: "./getAnotherPet.json",
        },
      });
    });

    it("duplicate @example pathOrUri on operation", async () => {
      const runner = await createAutorestTestRunner();
      const diagnostics = await runner.diagnose(
        `
        model Pet {
          name: string;
        }

        @get
        @operationId("Pets_Get")
        @Autorest.example("./getPet.json", "Get a pet")
        @Autorest.example("./getPet.json", "Get another pet")
        op read(): Pet;
        `
      );

      expectDiagnostics(ignoreUseStandardOps(diagnostics), {
        code: "@azure-tools/typespec-autorest/duplicate-example",
        message: "Duplicate @example declarations on operation",
      });
    });

    it("duplicate @example title on operation", async () => {
      const runner = await createAutorestTestRunner();
      const diagnostics = await runner.diagnose(
        `
        model Pet {
          name: string;
        }

        @get
        @operationId("Pets_Get")
        @Autorest.example("./getPet.json", "Get a pet")
        @Autorest.example("./getAnotherPet.json", "Get a pet")
        op read(): Pet;
        `
      );

      expectDiagnostics(ignoreUseStandardOps(diagnostics), {
        code: "@azure-tools/typespec-autorest/duplicate-example",
        message: "Duplicate @example declarations on operation",
      });
    });

    it("duplicate example file", async () => {
      const host = await createAutorestTestHost();
      const runner = await createAutorestTestRunner(host, {
        "examples-directory": resolveVirtualPath("./examples"),
      });

      host.addTypeSpecFile(
        "./examples/getPet1.json",
        JSON.stringify({ operationId: "Pets_get", title: "Get a pet" })
      );

      host.addTypeSpecFile(
        "./examples/getPet2.json",
        JSON.stringify({ operationId: "Pets_get", title: "Get a pet" })
      );

      const diagnostics = await runner.diagnose(
        `
        model Pet {
          name: string;
        }
        @get
        @operationId("Pets_Get")
        op read(): Pet;
        `
      );

      expectDiagnostics(ignoreUseStandardOps(diagnostics), {
        code: "@azure-tools/typespec-autorest/duplicate-example-file",
        severity: "error",
      });
    });
  });
});
