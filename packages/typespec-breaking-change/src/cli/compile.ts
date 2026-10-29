import { compile, NodeHost, type CompilerHost, type Program } from "@typespec/compiler";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Options for compiling a TypeSpec entry point.
 */
export interface CompileOptions {
  /** The compiler host to use. Defaults to NodeHost. */
  host?: CompilerHost;
  /** Additional compiler options (e.g., noEmit). */
  noEmit?: boolean;
}

/** Resolve the optional path to this package's TypeSpec library. */
function getLibraryPath(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), "..", "..", "lib", "main.tsp");
}

/**
 * Compile a TypeSpec entry point and return the Program.
 * Wraps the compiler's `compile()` with sensible defaults for analysis (no emit).
 *
 * @param mainFile - Path to the TypeSpec entry point (e.g., "main.tsp")
 * @param options - Compilation options
 * @returns The compiled Program
 * @throws If the program has errors (diagnostics with severity "error")
 */
export async function compileService(
  mainFile: string,
  options: CompileOptions = {},
): Promise<Program> {
  const host = options.host ?? NodeHost;
  const libraryPath = getLibraryPath();
  const program = await compile(host, mainFile, {
    noEmit: options.noEmit ?? true,
    additionalImports: existsSync(libraryPath) ? [libraryPath] : [],
  });

  return program;
}
