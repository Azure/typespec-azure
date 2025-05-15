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
import { AutorestCanonicalEmitterOptions } from "../src/lib.js";
import { AutorestCanonicalTestLibrary } from "../src/testing/index.js";

export async function createAutorestCanonicalTestHost() {
  return createTestHost({
    libraries: [
      HttpTestLibrary,
      RestTestLibrary,
      OpenAPITestLibrary,
      AutorestCanonicalTestLibrary,
      VersioningTestLibrary,
    ],
  });
}

export async function createAutorestCanonicalTestRunner(host?: TestHost) {
  host ??= await createAutorestCanonicalTestHost();
  return createTestWrapper(host, {
    autoUsings: ["Versioning", "Http", "Rest", "OpenAPI"],
  });
}

export async function openApiFor(code: string, options: AutorestCanonicalEmitterOptions = {}) {
  const runner = await createAutorestCanonicalTestRunner();
  const diagnostics = await runner.diagnose(code, {
    noEmit: false,
    emit: ["@azure-tools/typespec-autorest-canonical"],
    options: {
      [AutorestCanonicalTestLibrary.name]: {
        ...options,
        "emitter-output-dir": resolveVirtualPath("tsp-output"),
      },
    },
  });

  expectDiagnosticEmpty(diagnostics);
  const outPath = resolveVirtualPath("tsp-output", "canonical", "openapi.json");
  return JSON.parse(runner.fs.get(outPath)!);
}

export async function diagnoseOpenApiFor(
  code: string,
  options: AutorestCanonicalEmitterOptions = {},
) {
  const runner = await createAutorestCanonicalTestRunner();
  return await runner.diagnose(code, {
    emit: ["@azure-tools/typespec-autorest-canonical"],
    options: {
      "@azure-tools/typespec-autorest-canonical": options as any,
    },
  });
}
