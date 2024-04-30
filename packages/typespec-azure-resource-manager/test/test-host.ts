import { AutorestEmitterOptions } from "@azure-tools/typespec-autorest";
import { AutorestTestLibrary } from "@azure-tools/typespec-autorest/testing";
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Diagnostic, Program } from "@typespec/compiler";
import {
  createTestHost,
  createTestWrapper,
  expectDiagnosticEmpty,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { OpenAPI2Document } from "../../typespec-autorest/src/openapi2-document.js";
import { $lib } from "../src/lib.js";
import { AzureResourceManagerTestLibrary } from "../src/testing/index.js";

export async function createAzureResourceManagerTestHost() {
  return createTestHost({
    libraries: [
      HttpTestLibrary,
      RestTestLibrary,
      OpenAPITestLibrary,
      AutorestTestLibrary,
      AzureCoreTestLibrary,
      VersioningTestLibrary,
      AzureResourceManagerTestLibrary,
    ],
  });
}

export async function createAzureResourceManagerTestRunner() {
  const host = await createAzureResourceManagerTestHost();
  return createTestWrapper(host, {
    autoUsings: [`Azure.ResourceManager`, `TypeSpec.Http`, `TypeSpec.Rest`, `TypeSpec.Versioning`],
  });
}

export async function getOpenApiAndDiagnostics(
  code: string,
  options: AutorestEmitterOptions = {},
  versions?: string[]
): Promise<[any, readonly Diagnostic[]]> {
  const runner = await createAzureResourceManagerTestRunner();
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
    return [output, diagnostics];
  }

  const outPath = resolveVirtualPath("tsp-output", "openapi.json");
  return [JSON.parse(runner.fs.get(outPath)!), diagnostics];
}

export async function openApiFor(
  code: string,
  options: AutorestEmitterOptions = {},
  versions?: string[]
): Promise<any> {
  const [openApi, diagnostics] = await getOpenApiAndDiagnostics(code, options, versions);
  expectDiagnosticEmpty(diagnostics);
  return openApi;
}

export async function openApiForVersions<T extends string>(
  code: string,
  versions: T[],
  options: AutorestEmitterOptions = {}
): Promise<Record<T, OpenAPI2Document>> {
  const [openApi, diagnostics] = await getOpenApiAndDiagnostics(code, options, versions);
  expectDiagnosticEmpty(diagnostics);
  return openApi;
}

export async function checkFor(
  code: string
): Promise<{ program: Program; diagnostics: readonly Diagnostic[] }> {
  const runner = await createAzureResourceManagerTestRunner();
  const diagnostics = await runner.diagnose(code);
  return { program: runner.program, diagnostics };
}

export function getDiagnostic(code: keyof typeof $lib.diagnostics, diagnostics: Diagnostic[]) {
  return diagnostics.filter((diag) => diag.code === `${$lib.name}/${code}`);
}
