import { Diagnostic, resolvePath } from "@typespec/compiler";
import {
  createTester,
  EmitterTesterInstance,
  expectDiagnosticEmpty,
  resolveVirtualPath,
} from "@typespec/compiler/testing";
import { ok } from "assert";
import { AutorestEmitterOptions } from "../src/lib.js";
import { OpenAPI2Document } from "../src/openapi2-document.js";

export const ApiTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@azure-tools/typespec-autorest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
  ],
});

export const BasicTester = ApiTester.import("@azure-tools/typespec-autorest").using("Autorest");

const defaultOptions = {
  "emitter-output-dir": resolveVirtualPath("./tsp-output"),
};
export const Tester = BasicTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/openapi",
  "@typespec/versioning",
)
  .using("Http", "Rest", "OpenAPI", "Versioning")
  .emit("@azure-tools/typespec-autorest", defaultOptions);

/** Tester that will load Azure libraries. Only use if needed, will slow down the tests */
export const AzureTester = ApiTester.importLibraries()
  .using(
    "Versioning",
    "Http",
    "Rest",
    "OpenAPI",
    "Autorest",
    "Azure.Core",
    "Azure.ResourceManager",
    "Azure.ClientGenerator.Core",
  )
  .emit("@azure-tools/typespec-autorest", defaultOptions);

export async function emitOpenApiWithDiagnostics(
  code: string,
  options: AutorestEmitterOptions = {},
): Promise<[OpenAPI2Document, readonly Diagnostic[]]> {
  const [{ outputs }, diagnostics] = await Tester.compileAndDiagnose(code, {
    compilerOptions: {
      options: {
        "@azure-tools/typespec-autorest": { ...options },
      },
    },
  });
  const content = outputs["openapi.json"];
  ok(content, "Expected to have found openapi output");
  const doc = JSON.parse(content);
  return [doc, ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"])];
}

interface CompileOpenAPIOptions {
  preset?: "simple" | "azure";
  tester?: EmitterTesterInstance<any>;
  options?: AutorestEmitterOptions;
}

export async function compileOpenAPI(
  code: string,
  options: CompileOpenAPIOptions = {},
): Promise<OpenAPI2Document> {
  const tester =
    options?.tester ?? (await (options.preset === "azure" ? AzureTester : Tester).createInstance());
  const [{ outputs }, diagnostics] = await tester.compileAndDiagnose(code, {
    compilerOptions: options?.options
      ? {
          options: {
            "@azure-tools/typespec-autorest": { ...defaultOptions, ...options.options },
          },
        }
      : undefined,
  });
  expectDiagnosticEmpty(ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"]));
  return JSON.parse(outputs["openapi.json"]);
}

export async function compileVersionedOpenAPI<K extends string>(
  code: string,
  versions: K[],
  options: CompileOpenAPIOptions = {},
): Promise<Record<K, OpenAPI2Document>> {
  const [{ outputs }, diagnostics] = await Tester.compileAndDiagnose(code, {
    compilerOptions: options?.options
      ? {
          options: {
            "@azure-tools/typespec-autorest": { ...defaultOptions, ...options.options },
          },
        }
      : undefined,
  });
  expectDiagnosticEmpty(ignoreDiagnostics(diagnostics, ["@typespec/http/no-service-found"]));

  const output: any = {};
  for (const version of versions) {
    output[version] = JSON.parse(outputs[resolvePath(version, "openapi.json")]);
  }
  return output;
}

/**
 * Deprecated use `compileOpenAPI` or `compileVersionedOpenAPI` instead
 */
export async function openApiFor(
  code: string,
  versions?: string[],
  options: AutorestEmitterOptions = {},
): Promise<any> {
  if (versions) {
    return compileVersionedOpenAPI(code, versions, { options });
  }
  return compileOpenAPI(code, { options });
}

export async function diagnoseOpenApiFor(code: string, options: AutorestEmitterOptions = {}) {
  return await Tester.diagnose(code, {
    compilerOptions: {
      options: {
        "@azure-tools/typespec-autorest": options as any,
      },
    },
  });
}

export async function oapiForModel(name: string, modelDef: string) {
  const oapi = await compileOpenAPI(`
    ${modelDef};
    @service(#{title: "Testing model"})
    @route("/")
    namespace root {
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
      op read(): ${name};
    }
  `);

  const response = oapi.paths["/"]?.get?.responses?.[200];
  const useSchema = (response as any)?.schema;

  return {
    isRef: !!useSchema?.$ref,
    useSchema,
    defs: oapi.definitions as any,
    response: response,
  };
}

export function ignoreDiagnostics(
  diagnostics: readonly Diagnostic[],
  codes: string[],
): readonly Diagnostic[] {
  return diagnostics.filter((x) => codes.indexOf(x.code) === -1);
}

export function ignoreUseStandardOps(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
  return ignoreDiagnostics(diagnostics, [
    "@azure-tools/typespec-azure-core/use-standard-operations",
  ]);
}
