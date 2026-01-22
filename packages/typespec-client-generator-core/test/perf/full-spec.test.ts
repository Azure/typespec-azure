import { compile, EmitContext, NodeHost, normalizePath, Program } from "@typespec/compiler";
import { resolveVirtualPath } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { existsSync, readdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, it } from "vitest";
import { createSdkContext, CreateSdkContextOptions } from "../../src/context.js";
import { SdkContext, SdkHttpOperation, SdkServiceOperation } from "../../src/interfaces.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const specsDir = join(__dirname, "specs");

interface SpecEntry {
  name: string;
  path: string;
  entrypoint: string;
}

/**
 * Recursively finds all spec directories containing main.tsp or client.tsp files
 */
function findSpecs(dir: string, baseName = ""): SpecEntry[] {
  const entries: SpecEntry[] = [];

  if (!existsSync(dir)) {
    return entries;
  }

  const items = readdirSync(dir);

  // Check if this directory has an entrypoint
  const clientTsp = join(dir, "client.tsp");
  const mainTsp = join(dir, "main.tsp");

  if (existsSync(clientTsp)) {
    entries.push({
      name: baseName || dirname(dir).split(/[\\/]/).pop() || "unknown",
      path: dir,
      entrypoint: clientTsp,
    });
    return entries;
  } else if (existsSync(mainTsp)) {
    entries.push({
      name: baseName || dirname(dir).split(/[\\/]/).pop() || "unknown",
      path: dir,
      entrypoint: mainTsp,
    });
    return entries;
  }

  // Recurse into subdirectories
  for (const item of items) {
    const itemPath = join(dir, item);
    if (statSync(itemPath).isDirectory()) {
      const subName = baseName ? `${baseName}/${item}` : item;
      entries.push(...findSpecs(itemPath, subName));
    }
  }

  return entries;
}

/**
 * Helper to create SDK context from a compiled program
 */
async function createSdkContextFromProgram<
  TOptions extends Record<string, any> = Record<string, any>,
  TServiceOperation extends SdkServiceOperation = SdkHttpOperation,
>(
  program: Program,
  options: TOptions = {} as TOptions,
  sdkContextOption?: CreateSdkContextOptions,
): Promise<SdkContext<TOptions, TServiceOperation>> {
  const emitContext: EmitContext<TOptions> = {
    program: program,
    emitterOutputDir: resolveVirtualPath("tsp-output"),
    options: options,
  };
  return await createSdkContext(
    emitContext,
    options["emitter-name"] ?? "@azure-tools/typespec-csharp",
    sdkContextOption,
  );
}

describe("Perf: createSdkContext", () => {
  const specs = findSpecs(specsDir);

  if (specs.length === 0) {
    it.skip("No specs found under bench/specs", () => {});
    return;
  }

  describe("Compile and create SDK context for all specs", () => {
    for (const spec of specs) {
      it(`${spec.name}`, { timeout: 60000 }, async () => {
        const entrypoint = normalizePath(spec.entrypoint);
        const program = await compile(NodeHost, entrypoint, {
          noEmit: true,
          outputDir: process.cwd(),
        });
        strictEqual(program.diagnostics.length, 0);

        const sdkContextStart = performance.now();
        await createSdkContextFromProgram(
          program,
          { "emitter-name": "@azure-tools/typespec-csharp" },
          { exportTCGCoutput: false },
        );
        const sdkContextEnd = performance.now();
        const sdkContextTime = sdkContextEnd - sdkContextStart;
        ok(sdkContextTime < 60000);
      });
    }
  });
});
