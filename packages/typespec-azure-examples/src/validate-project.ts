import type { Diagnostic } from "@typespec/compiler";
import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { discoverExampleFiles } from "./discover.js";
import { loadExampleFile, parseServiceVersions } from "./loader.js";
import type { ExampleDiagnostic } from "./types.js";
import { validateApiExamples } from "./validate-api.js";

/** Compile the actual API in memory; never overwrite generated files while validating examples. */
export async function validateProjectExamples(dir: string): Promise<ExampleDiagnostic[]> {
  const { compile, getSourceLocation, NodeHost, resolveCompilerOptions } =
    await import("@typespec/compiler");
  const paths = await discoverExampleFiles(dir);
  const files = await Promise.all(
    paths.map(async (path) => loadExampleFile(path, await readFile(path, "utf-8"))),
  );
  const entrypoint = resolve(dir, "main.tsp");
  const toDiagnostic = (diagnostic: Diagnostic): ExampleDiagnostic => {
    const location = getSourceLocation(diagnostic.target);
    const position = location?.file.getLineAndCharacterOfPosition(location.pos);
    return {
      code: diagnostic.code,
      severity: diagnostic.severity,
      file: location?.file.path ?? entrypoint,
      ...(position ? { line: position.line + 1, col: position.character + 1 } : {}),
      message: diagnostic.message,
    };
  };
  const [options, configDiagnostics] = await resolveCompilerOptions(NodeHost, {
    entrypoint,
    cwd: resolve(dir),
    env: process.env,
  });
  if (configDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return configDiagnostics.map(toDiagnostic);
  }
  const output = new Map<string, Record<string, unknown>>();
  const emitter = "@azure-tools/typespec-autorest";
  const host = {
    ...NodeHost,
    mkdirp: async () => undefined,
    writeFile: async (path: string, text: string) => {
      if (!path.endsWith(".json")) return;
      const document = JSON.parse(text) as Record<string, unknown>;
      if (document.swagger === "2.0") output.set(path, document);
    },
  };
  const program = await compile(host, entrypoint, {
    ...options,
    noEmit: false,
    emit: [emitter],
    options: {
      ...options.options,
      [emitter]: {
        ...options.options?.[emitter],
        "service-yaml": "never",
        "skip-example-copying": true,
      },
    },
  });
  const diagnostics = [...configDiagnostics, ...program.diagnostics].map(toDiagnostic);
  if (program.hasError()) return diagnostics;
  if (output.size === 0) {
    return [
      ...diagnostics,
      {
        code: "missing-api-contract",
        severity: "error",
        file: entrypoint,
        message: "No API contract was produced by @azure-tools/typespec-autorest.",
      },
    ];
  }
  let versions: string[] = [];
  try {
    versions = parseServiceVersions(await readFile(join(dir, "service.yaml"), "utf-8")).versions;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  diagnostics.push(...(await validateApiExamples(files, output, versions)));
  return diagnostics;
}
