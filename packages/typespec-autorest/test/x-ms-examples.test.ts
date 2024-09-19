import {
  BasicTestRunner,
  expectDiagnostics,
  resolveVirtualPath,
  TestHost,
} from "@typespec/compiler/testing";
import { deepStrictEqual } from "assert";
import { beforeEach, describe, expect, it } from "vitest";
import {
  compileOpenAPI,
  createAutorestTestHost,
  createAutorestTestRunner,
  ignoreUseStandardOps,
} from "./test-host.js";

let runner: BasicTestRunner;

beforeEach(async () => {
  runner = await createAutorestTestRunner();
});

describe("with @example decorator", () => {
  it("applies @example on operation", async () => {
    const diagnostics = await runner.diagnose(
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

      @get
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

      @get
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
      `,
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
      `,
    );

    expectDiagnostics(ignoreUseStandardOps(diagnostics), {
      code: "@azure-tools/typespec-autorest/duplicate-example",
      message: "Duplicate @example declarations on operation",
    });
  });
});

describe("explicit example", () => {
  let host: TestHost;

  beforeEach(async () => {
    host = await createAutorestTestHost();
  });
  function addExampleFile(path: string, content: any) {
    host.addTypeSpecFile(path, JSON.stringify(content));
  }

  it("read examples from {project-root}/examples by default", async () => {
    addExampleFile("./examples/getPet.json", { operationId: "Pets_get", title: "Get a pet" });

    const openapi = await compileOpenAPI(`@operationId("Pets_get") op read(): void;`, {
      host,
    });

    deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
      "Get a pet": {
        $ref: "./examples/getPet.json",
      },
    });
    expect(host.fs.has(resolveVirtualPath("./tsp-output/examples/getPet.json"))).toBe(true);
  });

  it("read examples from examples-dir", async () => {
    addExampleFile("./my-examples/getPet.json", { operationId: "Pets_get", title: "Get a pet" });

    const openapi = await compileOpenAPI(`@operationId("Pets_get") op read(): void;`, {
      host,
      options: { "examples-dir": resolveVirtualPath("./my-examples") },
    });

    deepStrictEqual(openapi.paths["/"]?.get?.["x-ms-examples"], {
      "Get a pet": {
        $ref: "./examples/getPet.json",
      },
    });
    expect(host.fs.has(resolveVirtualPath("./tsp-output/examples/getPet.json"))).toBe(true);
  });

  it("emit diagnostic when example files use same operation id", async () => {
    const runner = await createAutorestTestRunner(host, {
      "examples-dir": resolveVirtualPath("./examples"),
    });

    addExampleFile("./examples/getPet1.json", { operationId: "Pets_get", title: "Get a pet" });
    addExampleFile("./examples/getPet2.json", { operationId: "Pets_get", title: "Get a pet" });

    const diagnostics = await runner.diagnose(` @operationId("Pets_get") op read(): string;`);

    expectDiagnostics(ignoreUseStandardOps(diagnostics), {
      code: "@azure-tools/typespec-autorest/duplicate-example-file",
      severity: "error",
    });
  });
});
