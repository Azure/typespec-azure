import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
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
import { AutorestEmitterOptions } from "../src/lib.js";
import { AutorestTestLibrary } from "../src/testing/index.js";
import { OpenAPI2Document } from "../src/types.js";

export async function createAutorestTestHost() {
  return createTestHost({
    libraries: [
      HttpTestLibrary,
      RestTestLibrary,
      OpenAPITestLibrary,
      AutorestTestLibrary,
      VersioningTestLibrary,
      AzureCoreTestLibrary,
    ],
  });
}

export async function createAutorestTestRunner(
  host?: TestHost,
  emitterOptions?: AutorestEmitterOptions
) {
  host ??= await createAutorestTestHost();
  return createTestWrapper(host, {
    autoUsings: [
      "TypeSpec.Versioning",
      "TypeSpec.Http",
      "TypeSpec.Rest",
      "TypeSpec.OpenAPI",
      "Autorest",
      "Azure.Core",
    ],
    compilerOptions: {
      emitters: { [AutorestTestLibrary.name]: { ...emitterOptions } },
      miscOptions: { "disable-linter": true },
    },
  });
}

export async function emitOpenApiWithDiagnostics(
  code: string,
  options: AutorestEmitterOptions = {}
): Promise<[OpenAPI2Document, readonly Diagnostic[]]> {
  const runner = await createAutorestTestRunner();
  const outputFile = resolveVirtualPath("openapi.json");
  const diagnostics = await runner.diagnose(code, {
    noEmit: false,
    emit: ["@azure-tools/typespec-autorest"],
    options: {
      "@azure-tools/typespec-autorest": { ...options, "output-file": outputFile },
    },
  });
  const content = runner.fs.get(outputFile);
  ok(content, "Expected to have found openapi output");
  const doc = JSON.parse(content);
  return [doc, ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"])];
}

export async function openApiFor(
  code: string,
  versions?: string[],
  options: AutorestEmitterOptions = {}
) {
  const runner = await createAutorestTestRunner();
  const diagnostics = await runner.diagnose(code, {
    noEmit: false,
    emitters: {
      [AutorestTestLibrary.name]: {
        ...options,
        "emitter-output-dir": resolveVirtualPath("tsp-output"),
      },
    },
  });

  if (versions) {
    const output: any = {};
    for (const version of versions) {
      output[version] = JSON.parse(
        runner.fs.get(resolveVirtualPath("tsp-output", version, "openapi.json"))!
      );
    }
    return output;
  }
  expectDiagnosticEmpty(
    ignoreDiagnostics(diagnostics, [
      "@azure-tools/typespec-azure-core/use-standard-operations",
      "@typespec/http/no-service-found",
    ])
  );
  const outPath = resolveVirtualPath("tsp-output", "openapi.json");
  return JSON.parse(runner.fs.get(outPath)!);
}

export async function diagnoseOpenApiFor(code: string, options: AutorestEmitterOptions = {}) {
  const runner = await createAutorestTestRunner();
  return await runner.diagnose(code, {
    emitters: {
      "@azure-tools/typespec-autorest": options as any,
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
