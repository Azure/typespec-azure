import { compile, NodeHost, type CompilerHost, type Program } from "@typespec/compiler";

/**
 * Options for compiling a TypeSpec entry point.
 */
export interface CompileOptions {
  /** The compiler host to use. Defaults to NodeHost. */
  host?: CompilerHost;
  /** Additional compiler options (e.g., noEmit). */
  noEmit?: boolean;
}

/**
 * Compile a TypeSpec entry point and return the Program.
 * Wraps the compiler's `compile()` with sensible defaults for analysis (no emit).
 * Specifications using approval decorators must import Azure.Core explicitly.
 *
 * @param mainFile - Path to the TypeSpec entry point (e.g., "main.tsp")
 * @param options - Compilation options
 * @returns The compiled Program
 * Compilation diagnostics are returned on the Program for the caller to handle.
 */
export async function compileService(
  mainFile: string,
  options: CompileOptions = {},
): Promise<Program> {
  const host = options.host ?? NodeHost;
  const program = await compile(host, mainFile, {
    noEmit: options.noEmit ?? true,
  });

  return program;
}
