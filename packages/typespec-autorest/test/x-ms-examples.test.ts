import {
  EmitterTesterInstance,
  expectDiagnosticEmpty,
  expectDiagnostics,
  resolveVirtualPath,
  TestEmitterCompileResult,
} from "@typespec/compiler/testing";
import { deepStrictEqual } from "assert";
import { beforeEach, describe, expect, it } from "vitest";
import { compileOpenAPI, ignoreDiagnostics, ignoreUseStandardOps, Tester } from "./test-host.js";

let tester: EmitterTesterInstance<TestEmitterCompileResult>;

beforeEach(async () => {
  tester = await Tester.createInstance();
});

describe("with @example decorator", () => {
  it("applies @example on operation", async () => {
    const diagnostics = await tester.diagnose(
      `
      model A {
        @Autorest.example("./someExample.json", "Some example")
        name: string;
      }
      `,
    );

    expectDiagnostics(ignoreUseStandardOps(diagnostics), {
      code: "decorator-wrong-target",
      message:
        "Cannot apply @example decorator to (anonymous model).name since it is not assignable to Operation",
    });
  });

  it("adds an example to an operation", async () => {
    const openapi = await compileOpenAPI(
      `
      model Pet {
        name: string;
      }

      @operationId("Pets_Get")
      @Autorest.example("./getPet.json", "Get a pet")
      op read(): Pet;
      `,
    );

    deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
      "Get a pet": {
        $ref: "./getPet.json",
      },
    });
  });

  it("adds multiple examples to an operation", async () => {
    const openapi = await compileOpenAPI(
      `
      model Pet {
        name: string;
      }

      @operationId("Pets_Get")
      @Autorest.example("./getPet.json", "Get a pet")
      @Autorest.example("./getAnotherPet.json", "Get another pet")
      op read(): Pet;
      `,
    );

    deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
      "Get a pet": {
        $ref: "./getPet.json",
      },
      "Get another pet": {
        $ref: "./getAnotherPet.json",
      },
    });
  });

  it("duplicate @example pathOrUri on operation", async () => {
    const diagnostics = await tester.diagnose(
      `
      model Pet {
        name: string;
      }

      @get
      @operationId("Pets_Get")
      @Autorest.example("./getPet.json", "Get a pet")
      @Autorest.example("./getPet.json", "Get another pet")
      op read(): Pet;
      `,
    );

    expectDiagnostics(ignoreUseStandardOps(diagnostics), {
      code: "@azure-tools/typespec-autorest/duplicate-example",
      message: "Duplicate @example declarations on operation",
    });
  });

  it("duplicate @example title on operation", async () => {
    const diagnostics = await tester.diagnose(
      `
      model Pet {
        name: string;
      }

      @get
      @operationId("Pets_Get")
      @Autorest.example("./getPet.json", "Get a pet")
      @Autorest.example("./getAnotherPet.json", "Get a pet")
      op read(): Pet;
      `,
    );

    expectDiagnostics(ignoreUseStandardOps(diagnostics), {
      code: "@azure-tools/typespec-autorest/duplicate-example",
      message: "Duplicate @example declarations on operation",
    });
  });
});

describe("explicit example", () => {
  function addExampleFile(path: string, content: any) {
    tester.fs.add(path, JSON.stringify(content));
  }

  it("read examples from {project-root}/examples by default", async () => {
    addExampleFile("./examples/getPet.json", { operationId: "Pets_get", title: "Get a pet" });

    const openapi = await compileOpenAPI(`@operationId("Pets_get") op read(): void;`, {
      tester,
    });

    deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
      "Get a pet": {
        $ref: "./examples/getPet.json",
      },
    });
    expect(tester.fs.fs.has(resolveVirtualPath("./tsp-output/examples/getPet.json"))).toBe(true);
  });

  it("read nested examples from {project-root}/examples", async () => {
    addExampleFile("./examples/pets/getPet.json", { operationId: "Pets_get", title: "Get a pet" });

    const openapi = await compileOpenAPI(`@operationId("Pets_get") op read(): void;`, {
      tester,
    });

    deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
      "Get a pet": {
        $ref: "./examples/pets/getPet.json",
      },
    });
    expect(tester.fs.fs.has(resolveVirtualPath("./tsp-output/examples/pets/getPet.json"))).toBe(
      true,
    );
  });

  it("read examples from examples-dir", async () => {
    addExampleFile("./my-examples/getPet.json", { operationId: "Pets_get", title: "Get a pet" });

    const openapi = await compileOpenAPI(`@operationId("Pets_get") op read(): void;`, {
      tester,
      options: { "examples-dir": resolveVirtualPath("./my-examples") },
    });

    deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
      "Get a pet": {
        $ref: "./examples/getPet.json",
      },
    });
    expect(tester.fs.fs.has(resolveVirtualPath("./tsp-output/examples/getPet.json"))).toBe(true);
  });

  it("read nested examples from examples-dir", async () => {
    addExampleFile("./my-examples/pets/getPet.json", {
      operationId: "Pets_get",
      title: "Get a pet",
    });

    const openapi = await compileOpenAPI(`@operationId("Pets_get") op read(): void;`, {
      tester,
      options: { "examples-dir": resolveVirtualPath("./my-examples") },
    });

    deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
      "Get a pet": {
        $ref: "./examples/pets/getPet.json",
      },
    });
    expect(tester.fs.fs.has(resolveVirtualPath("./tsp-output/examples/pets/getPet.json"))).toBe(
      true,
    );
  });

  it("emit diagnostic when example files use same operation id", async () => {
    addExampleFile("./examples/getPet1.json", { operationId: "Pets_get", title: "Get a pet" });
    addExampleFile("./examples/getPet2.json", { operationId: "Pets_get", title: "Get a pet" });

    const diagnostics = await tester.diagnose(` @operationId("Pets_get") op read(): string;`);

    expectDiagnostics(ignoreUseStandardOps(diagnostics), {
      severity: "error",
      code: "@azure-tools/typespec-autorest/duplicate-example-file",
    });
  });

  describe("with skip-example-copying", () => {
    it("references source example with relative path and does not copy", async () => {
      addExampleFile("./examples/getPet.json", { operationId: "Pets_get", title: "Get a pet" });

      const openapi = await compileOpenAPI(`@operationId("Pets_get") op read(): void;`, {
        tester,
        options: { "skip-example-copying": true },
      });

      deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
        "Get a pet": {
          $ref: "../examples/getPet.json",
        },
      });
      expect(tester.fs.fs.has(resolveVirtualPath("./tsp-output/examples/getPet.json"))).toBe(false);
    });

    it("references nested source example with relative path and does not copy", async () => {
      addExampleFile("./examples/pets/getPet.json", {
        operationId: "Pets_get",
        title: "Get a pet",
      });

      const openapi = await compileOpenAPI(`@operationId("Pets_get") op read(): void;`, {
        tester,
        options: { "skip-example-copying": true },
      });

      deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
        "Get a pet": {
          $ref: "../examples/pets/getPet.json",
        },
      });
      expect(tester.fs.fs.has(resolveVirtualPath("./tsp-output/examples/pets/getPet.json"))).toBe(
        false,
      );
    });

    it("references source example from custom examples-dir", async () => {
      addExampleFile("./my-examples/getPet.json", {
        operationId: "Pets_get",
        title: "Get a pet",
      });

      const openapi = await compileOpenAPI(`@operationId("Pets_get") op read(): void;`, {
        tester,
        options: {
          "skip-example-copying": true,
          "examples-dir": resolveVirtualPath("./my-examples"),
        },
      });

      deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
        "Get a pet": {
          $ref: "../my-examples/getPet.json",
        },
      });
      expect(tester.fs.fs.has(resolveVirtualPath("./tsp-output/examples/getPet.json"))).toBe(false);
    });

    it("references source example with relative path in versioned spec and does not copy", async () => {
      const emitterOutputDir = resolveVirtualPath("./tsp-output");
      // Examples are placed under the versioned output folder
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v1/examples/getPet.json"),
        JSON.stringify({ operationId: "Pets_get", title: "Get a pet v1" }),
      );
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v2/examples/getPet.json"),
        JSON.stringify({ operationId: "Pets_get", title: "Get a pet v2" }),
      );

      const [{ outputs }, diagnostics] = await tester.compileAndDiagnose(
        `
@versioned(Versions)
@service(#{title: "Pet Service"})
namespace PetService;
enum Versions {v1, v2}

@operationId("Pets_get")
op read(): void;
`,
        {
          compilerOptions: {
            options: {
              "@azure-tools/typespec-autorest": {
                "emitter-output-dir": emitterOutputDir,
                "examples-dir": `${emitterOutputDir}/{version-status}/{version}/examples`,
                "skip-example-copying": true,
              },
            },
          },
        },
      );
      expectDiagnosticEmpty(ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"]));

      const v1Doc = JSON.parse(outputs["stable/v1/openapi.json"]);
      const v2Doc = JSON.parse(outputs["stable/v2/openapi.json"]);

      // $ref should be relative to the swagger file: examples/getPet.json
      deepStrictEqual(v1Doc.paths["/"]?.get?.["x-ms-examples"], {
        "Get a pet v1": {
          $ref: "examples/getPet.json",
        },
      });
      deepStrictEqual(v2Doc.paths["/"]?.get?.["x-ms-examples"], {
        "Get a pet v2": {
          $ref: "examples/getPet.json",
        },
      });
    });

    it("picks up version-specific examples with interpolated examples-dir for multiple versions", async () => {
      const emitterOutputDir = resolveVirtualPath("./tsp-output");
      // v1 has getPet and listPets; v2 has getPet and deletePet
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v1/examples/getPet.json"),
        JSON.stringify({ operationId: "Pets_get", title: "Get a pet" }),
      );
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v1/examples/listPets.json"),
        JSON.stringify({ operationId: "Pets_list", title: "List pets" }),
      );
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v2/examples/getPet.json"),
        JSON.stringify({ operationId: "Pets_get", title: "Get a pet v2" }),
      );
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v2/examples/deletePet.json"),
        JSON.stringify({ operationId: "Pets_delete", title: "Delete a pet" }),
      );

      const [{ outputs }, diagnostics] = await tester.compileAndDiagnose(
        `
@versioned(Versions)
@service(#{title: "Pet Service"})
namespace PetService;
enum Versions {v1, v2}

@route("/pets")
@get
@operationId("Pets_get")
op read(): void;

@route("/pets")
@post
@operationId("Pets_list")
op list(): void;

@route("/pets")
@delete
@operationId("Pets_delete")
@added(Versions.v2)
op remove(): void;
`,
        {
          compilerOptions: {
            options: {
              "@azure-tools/typespec-autorest": {
                "emitter-output-dir": emitterOutputDir,
                "examples-dir": `${emitterOutputDir}/{version-status}/{version}/examples`,
                "skip-example-copying": true,
              },
            },
          },
        },
      );
      expectDiagnosticEmpty(ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"]));

      const v1Doc = JSON.parse(outputs["stable/v1/openapi.json"]);
      const v2Doc = JSON.parse(outputs["stable/v2/openapi.json"]);

      // v1 should have getPet and listPets examples with correct relative paths
      deepStrictEqual(v1Doc.paths["/pets"]?.get?.["x-ms-examples"], {
        "Get a pet": { $ref: "examples/getPet.json" },
      });
      deepStrictEqual(v1Doc.paths["/pets"]?.post?.["x-ms-examples"], {
        "List pets": { $ref: "examples/listPets.json" },
      });

      // v2 should have getPet and deletePet examples
      deepStrictEqual(v2Doc.paths["/pets"]?.get?.["x-ms-examples"], {
        "Get a pet v2": { $ref: "examples/getPet.json" },
      });
      deepStrictEqual(v2Doc.paths["/pets"]?.delete?.["x-ms-examples"], {
        "Delete a pet": { $ref: "examples/deletePet.json" },
      });
    });

    it("picks up examples in sub-directories of the versioned example directory", async () => {
      const emitterOutputDir = resolveVirtualPath("./tsp-output");
      // Examples in multiple sub-directories under the versioned examples folder,
      // simulating the real-world pattern: stable/2020-01-01/examples/FooResources/*.json
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v1/examples/PetResources/getPet.json"),
        JSON.stringify({ operationId: "Pets_get", title: "Get a pet" }),
      );
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v1/examples/PetResources/listPets.json"),
        JSON.stringify({ operationId: "Pets_list", title: "List all pets" }),
      );
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v1/examples/StoreResources/getStore.json"),
        JSON.stringify({ operationId: "Stores_get", title: "Get a store" }),
      );
      tester.fs.add(
        resolveVirtualPath("./tsp-output/stable/v1/examples/StoreResources/deleteStore.json"),
        JSON.stringify({ operationId: "Stores_delete", title: "Delete a store" }),
      );

      const [{ outputs }, diagnostics] = await tester.compileAndDiagnose(
        `
@versioned(Versions)
@service(#{title: "Pet Service"})
namespace PetService;
enum Versions {v1}

@route("/pets")
@get
@operationId("Pets_get")
op read(): void;

@route("/pets")
@post
@operationId("Pets_list")
op list(): void;

@route("/stores")
@get
@operationId("Stores_get")
op getStore(): void;

@route("/stores")
@delete
@operationId("Stores_delete")
op deleteStore(): void;
`,
        {
          compilerOptions: {
            options: {
              "@azure-tools/typespec-autorest": {
                "emitter-output-dir": emitterOutputDir,
                "examples-dir": `${emitterOutputDir}/{version-status}/{version}/examples`,
                "skip-example-copying": true,
              },
            },
          },
        },
      );
      expectDiagnosticEmpty(ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"]));

      const v1Doc = JSON.parse(outputs["stable/v1/openapi.json"]);

      // Sub-directory examples should be picked up with correct relative paths preserving sub-dir
      deepStrictEqual(v1Doc.paths["/pets"]?.get?.["x-ms-examples"], {
        "Get a pet": { $ref: "examples/PetResources/getPet.json" },
      });
      deepStrictEqual(v1Doc.paths["/pets"]?.post?.["x-ms-examples"], {
        "List all pets": { $ref: "examples/PetResources/listPets.json" },
      });
      deepStrictEqual(v1Doc.paths["/stores"]?.get?.["x-ms-examples"], {
        "Get a store": { $ref: "examples/StoreResources/getStore.json" },
      });
      deepStrictEqual(v1Doc.paths["/stores"]?.delete?.["x-ms-examples"], {
        "Delete a store": { $ref: "examples/StoreResources/deleteStore.json" },
      });

      // Verify no files were copied to a separate examples output
      expect(
        tester.fs.fs.has(resolveVirtualPath("./tsp-output/examples/PetResources/getPet.json")),
      ).toBe(false);
      expect(
        tester.fs.fs.has(resolveVirtualPath("./tsp-output/examples/StoreResources/getStore.json")),
      ).toBe(false);
    });
  });
});
