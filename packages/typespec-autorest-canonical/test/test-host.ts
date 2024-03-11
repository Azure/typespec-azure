import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { SdkTestLibrary as TcgcTestLibrary } from "@azure-tools/typespec-client-generator-core/testing";
import { Diagnostic } from "@typespec/compiler";
import {
  TestHost,
  createTestHost,
  createTestWrapper,
  expectDiagnosticEmpty,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { ok } from "assert";
import { AutorestCanonicalEmitterOptions } from "../src/lib.js";
import { AutorestCanonicalTestLibrary } from "../src/testing/index.js";
import { OpenAPI2Document } from "../src/types.js";

export async function createAutorestCanonicalTestHost() {
  return createTestHost({
    libraries: [
      HttpTestLibrary,
      RestTestLibrary,
      OpenAPITestLibrary,
      AutorestCanonicalTestLibrary,
      VersioningTestLibrary,
      AzureCoreTestLibrary,
      TcgcTestLibrary,
    ],
  });
}

export async function createAutorestCanonicalTestRunner(
  host?: TestHost,
  emitterOptions?: AutorestCanonicalEmitterOptions
) {
  host ??= await createAutorestCanonicalTestHost();
  return createTestWrapper(host, {
    autoUsings: [
      "TypeSpec.Versioning",
      "TypeSpec.Http",
      "TypeSpec.Rest",
      "TypeSpec.OpenAPI",
      "AutorestCanonical",
      "Azure.Core",
      "Azure.ClientGenerator.Core",
    ],
    compilerOptions: {
      emitters: { [AutorestCanonicalTestLibrary.name]: { ...emitterOptions } },
      miscOptions: { "disable-linter": true },
    },
  });
}

export async function emitOpenApiWithDiagnostics(
  code: string,
  options: AutorestCanonicalEmitterOptions = {}
): Promise<[OpenAPI2Document, readonly Diagnostic[]]> {
  const runner = await createAutorestCanonicalTestRunner();
  const outputFile = resolveVirtualPath("openapi.json");
  const diagnostics = await runner.diagnose(code, {
    noEmit: false,
    emit: ["@azure-tools/typespec-autorest-canonical"],
    options: {
      "@azure-tools/typespec-autorest-canonical": { ...options, "output-file": outputFile },
    },
  });
  const content = runner.fs.get(outputFile);
  ok(content, "Expected to have found openapi output");
  const doc = JSON.parse(content);
  return [doc, ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"])];
}

export async function openApiFor(code: string, options: AutorestCanonicalEmitterOptions = {}) {
  const runner = await createAutorestCanonicalTestRunner();
  const diagnostics = await runner.diagnose(code, {
    noEmit: false,
    emitters: {
      [AutorestCanonicalTestLibrary.name]: {
        ...options,
        "emitter-output-dir": resolveVirtualPath("tsp-output"),
      },
    },
  });

  expectDiagnosticEmpty(
    ignoreDiagnostics(diagnostics, [
      "@azure-tools/typespec-azure-core/use-standard-operations",
      "@typespec/http/no-service-found",
    ])
  );
  const outPath = resolveVirtualPath("tsp-output", "canonical", "openapi.json");
  return JSON.parse(runner.fs.get(outPath)!);
}

export async function diagnoseOpenApiFor(
  code: string,
  options: AutorestCanonicalEmitterOptions = {}
) {
  const runner = await createAutorestCanonicalTestRunner();
  return await runner.diagnose(code, {
    emitters: {
      "@azure-tools/typespec-autorest-canonical": options as any,
    },
  });
}

export async function oapiForModel(name: string, modelDef: string) {
  const oapi = await openApiFor(`
    ${modelDef};
    @service({title: "Testing model"})
    @route("/")
    namespace root {
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
      op read(): ${name};
    }
  `);

  const response = oapi.paths["/"].get.responses[200];
  const useSchema = response?.schema;

  return {
    isRef: !!useSchema?.$ref,
    useSchema,
    defs: oapi.definitions,
    response: response,
  };
}

export function ignoreDiagnostics(
  diagnostics: readonly Diagnostic[],
  codes: string[]
): readonly Diagnostic[] {
  return diagnostics.filter((x) => codes.indexOf(x.code) === -1);
}

export function ignoreUseStandardOps(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
  return ignoreDiagnostics(diagnostics, [
    "@azure-tools/typespec-azure-core/use-standard-operations",
  ]);
}
