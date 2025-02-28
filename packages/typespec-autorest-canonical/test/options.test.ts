import { OpenAPI2Document } from "@azure-tools/typespec-autorest";
import { resolvePath } from "@typespec/compiler";
import {
  BasicTestRunner,
  expectDiagnosticEmpty,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { AutorestCanonicalEmitterOptions } from "../src/lib.js";
import { createAutorestCanonicalTestRunner, ignoreDiagnostics } from "./test-host.js";

async function openapiWithOptions(
  code: string,
  options: AutorestCanonicalEmitterOptions,
): Promise<OpenAPI2Document> {
  const runner = await createAutorestCanonicalTestRunner();

  const outPath = resolvePath("/openapi.json");

  const diagnostics = await runner.diagnose(code, {
    noEmit: false,
    emitters: {
      "@azure-tools/typespec-autorest-canonical": { ...options, "output-file": outPath },
    },
  });

  expectDiagnosticEmpty(diagnostics.filter((x) => x.code !== "@typespec/http/no-service-found"));

  const content = runner.fs.get(outPath)!;
  return JSON.parse(content);
}

let runner: BasicTestRunner;
beforeEach(async () => {
  runner = await createAutorestCanonicalTestRunner();
});

describe("'new-line' option", () => {
  async function rawOpenApiFor(
    code: string,
    options: AutorestCanonicalEmitterOptions,
  ): Promise<string> {
    const outPath = resolvePath("/openapi.json");

    const diagnostics = await runner.diagnose(code, {
      noEmit: false,
      emitters: {
        "@azure-tools/typespec-autorest-canonical": { ...options, "output-file": outPath },
      },
    });

    expectDiagnosticEmpty(
      ignoreDiagnostics(diagnostics, [
        "@typespec/http/no-service-found",
        "@azure-tools/typespec-azure-core/use-standard-operations",
      ]),
    );

    return runner.fs.get(outPath)!;
  }

  // Content of an empty spec
  const expectedEmptySpec = [
    "{",
    `  "swagger": "2.0",`,
    `  "info": {`,
    `    "title": "(title)",`,
    `    "version": "canonical",`,
    `    "x-typespec-generated": [`,
    `      {`,
    `        "emitter": "@azure-tools/typespec-autorest-canonical"`,
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
          "@azure-tools/typespec-autorest-canonical": { "emitter-output-dir": emitterOutputDir },
        },
      },
    );
    ok(runner.fs.has(resolvePath(emitterOutputDir, "canonical/openapi.json")));
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
          "@azure-tools/typespec-autorest-canonical": {
            "emitter-output-dir": emitterOutputDir,
          },
        },
      },
    );
    ok(runner.fs.has(resolveVirtualPath("./my-output/canonical/openapi.json")));
  });

  it("emit to {emitter-output-dir}/{version}/{output-file} if spec contains versioning", async () => {
    const versionedRunner = await createAutorestCanonicalTestRunner();
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
        noEmit: false,
        outputPath: "./my-output",
        emitters: {
          "@azure-tools/typespec-autorest-canonical": {
            "emitter-output-dir": emitterOutputDir,
          },
        },
      },
    );
    ok(
      !versionedRunner.fs.has(resolveVirtualPath("./my-output/openapi.json")),
      "Shouldn't have created the non versioned file name",
    );
    ok(versionedRunner.fs.has(resolveVirtualPath("./my-output/canonical/openapi.json")));
  });

  it("emit to {emitter-output-dir}/{arm-folder}/{serviceName}/{versionType}/{version}/{output-file} if spec contains azure-resource-provider-folder is passed", async () => {
    const versionedRunner = await createAutorestCanonicalTestRunner();
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
        noEmit: false,
        outputPath: "./my-output",
        emitters: {
          "@azure-tools/typespec-autorest-canonical": {
            "emitter-output-dir": emitterOutputDir,
            "azure-resource-provider-folder": "./arm-folder",
          },
        },
      },
    );

    ok(
      !versionedRunner.fs.has(
        resolveVirtualPath("./my-output/arm-folder/TestService/stable/v1/openapi.json"),
      ),
    );
    ok(
      !versionedRunner.fs.has(
        resolveVirtualPath("./my-output/arm-folder/TestService/preview/v2-preview/openapi.json"),
      ),
    );
    ok(
      versionedRunner.fs.has(
        resolveVirtualPath("./my-output/arm-folder/TestService/canonical/openapi.json"),
      ),
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
      {},
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
      },
    );
    deepStrictEqual(Object.keys(output.definitions!), ["Referenced"]);
  });
});

describe("include-x-typespec-name", () => {
  it("doesn't include x-typespec-name by default", async () => {
    const output = await openapiWithOptions(
      `
        model Foo {names: string[]}
      `,
      {},
    );
    ok(!("x-typespec-name" in output.definitions!.Foo.properties!.names));
  });

  it(`doesn't include x-typespec-name when option include-x-typespec-name: "never"`, async () => {
    const output = await openapiWithOptions(
      `
        model Foo {names: string[]}
      `,
      { "include-x-typespec-name": "never" },
    );
    ok(!("x-typespec-name" in output.definitions!.Foo.properties!.names));
  });

  it(`include x-typespec-name when option include-x-typespec-name: "inline-only"`, async () => {
    const output = await openapiWithOptions(
      `
        model Foo {names: string[]}
      `,
      { "include-x-typespec-name": "inline-only" },
    );
    const prop: any = output.definitions!.Foo.properties!.names;
    strictEqual(prop["x-typespec-name"], `string[]`);
  });
});
