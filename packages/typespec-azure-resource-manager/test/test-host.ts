import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Diagnostic, Program } from "@typespec/compiler";
import { createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { $lib } from "../src/lib.js";
import { AzureResourceManagerTestLibrary } from "../src/testing/index.js";

export async function createAzureResourceManagerTestHost() {
  return createTestHost({
    libraries: [
      HttpTestLibrary,
      RestTestLibrary,
      OpenAPITestLibrary,
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

export async function checkFor(
  code: string,
): Promise<{ program: Program; diagnostics: readonly Diagnostic[] }> {
  const runner = await createAzureResourceManagerTestRunner();
  const diagnostics = await runner.diagnose(code);
  return { program: runner.program, diagnostics };
}

export function getDiagnostic(code: keyof typeof $lib.diagnostics, diagnostics: Diagnostic[]) {
  return diagnostics.filter((diag) => diag.code === `${$lib.name}/${code}`);
}
