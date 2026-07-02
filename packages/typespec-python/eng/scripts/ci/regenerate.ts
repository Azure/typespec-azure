/* eslint-disable no-console */
/**
 * Regenerates Python SDK code from TypeSpec definitions.
 *
 * Uses in-process TypeSpec compilation to avoid subprocess spawning overhead.
 * Specs are compiled in parallel and the emitter writes the final `.py` files
 * directly inside the same process — no YAML-only intermediate, no batched
 * Python subprocess.  This single-phase pipeline is faster for the wrapper
 * use-case (azure flavor only, smaller spec set, Windows).
 *
 * Shared helpers/data live in `regenerate-common.ts` and are kept identical
 * with the upstream `@typespec/http-client-python` copy via `pnpm sync`.
 */

import { platform } from "os";
import { dirname, resolve } from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

import {
  buildTaskGroups,
  getSubdirectories,
  prepareBaselineOfGeneratedCode,
  preprocess,
  RegenerateContext,
  RegenerateFlags,
  runParallel,
} from "./regenerate-common.js";

const argv = parseArgs({
  args: process.argv.slice(2),
  options: {
    flavor: { type: "string", short: "f" },
    name: { type: "string", short: "n" },
    debug: { type: "boolean", short: "d" },
    pluginDir: { type: "string" },
    emitterName: { type: "string" },
    generatedFolder: { type: "string" },
    httpSpecsDir: { type: "string" },
    azureSpecsDir: { type: "string" },
    "use-pyodide": { type: "boolean" },
    "no-baseline": { type: "boolean" },
    jobs: { type: "string", short: "j" },
    help: { type: "boolean", short: "h" },
  },
});

if (argv.values.help) {
  console.log(`
${pc.bold("Usage:")} tsx regenerate.ts [options]

${pc.bold("Description:")}
  Regenerates Python SDK code from TypeSpec definitions using in-process
  compilation.  This avoids spawning a new Node.js process for each spec,
  making it significantly faster.

${pc.bold("Options:")}
  ${pc.cyan("-f, --flavor <azure|unbranded>")}
      SDK flavor to regenerate. If not specified, regenerates both flavors.

  ${pc.cyan("-n, --name <pattern>")}
      Filter packages by name pattern (case-insensitive substring match).
      Examples:
        --name xml              Regenerate packages containing "xml"
        --name authentication   Regenerate authentication packages
        --name type/array       Regenerate the type/array package

  ${pc.cyan("-d, --debug")}
      Enable debug output during regeneration.

  ${pc.cyan("-j, --jobs <n>")}
      Number of parallel compilation tasks (default: 30 on Linux/Mac, 10 on Windows).

  ${pc.cyan("-h, --help")}
      Show this help message.

${pc.bold("Examples:")}
  ${pc.dim("# Regenerate all packages for both flavors")}
  tsx regenerate.ts

  ${pc.dim("# Regenerate only Azure packages")}
  tsx regenerate.ts --flavor azure

  ${pc.dim("# Regenerate a specific package by name")}
  tsx regenerate.ts --flavor azure --name authentication-api-key

  ${pc.dim("# Regenerate with more parallelism")}
  tsx regenerate.ts --jobs 50
`);
  process.exit(0);
}

// Resolve repo-specific paths.  PLUGIN_DIR defaults to two levels above this
// file (eng/scripts/ci -> eng/scripts -> eng -> packageRoot).
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_DIR = argv.values.pluginDir
  ? resolve(argv.values.pluginDir)
  : resolve(SCRIPT_DIR, "../../../");
const AZURE_HTTP_SPECS = argv.values.azureSpecsDir
  ? resolve(argv.values.azureSpecsDir)
  : resolve(PLUGIN_DIR, "node_modules/@azure-tools/azure-http-specs/specs");
const HTTP_SPECS = argv.values.httpSpecsDir
  ? resolve(argv.values.httpSpecsDir)
  : resolve(PLUGIN_DIR, "node_modules/@typespec/http-specs/specs");
const GENERATED_FOLDER = argv.values.generatedFolder
  ? resolve(argv.values.generatedFolder)
  : resolve(PLUGIN_DIR, "generator");
const EMITTER_NAME = argv.values.emitterName || "@azure-tools/typespec-python";

const ctx: RegenerateContext = {
  pluginDir: PLUGIN_DIR,
  azureHttpSpecs: AZURE_HTTP_SPECS,
  httpSpecs: HTTP_SPECS,
  generatedFolder: GENERATED_FOLDER,
  emitterName: EMITTER_NAME,
};

async function regenerateFlavor(
  flavor: string,
  name: string | undefined,
  debug: boolean,
  jobs: number,
  usePyodide: boolean,
): Promise<boolean> {
  console.log(pc.cyan(`\n${"=".repeat(60)}`));
  console.log(pc.cyan(`Regenerating ${flavor} flavor`));
  console.log(pc.cyan(`${"=".repeat(60)}\n`));

  const flags: RegenerateFlags = { flavor, debug, name };

  await preprocess(flavor, GENERATED_FOLDER);

  const azureSpecs = flavor === "azure" ? await getSubdirectories(AZURE_HTTP_SPECS, flags) : [];
  const standardSpecs = await getSubdirectories(HTTP_SPECS, flags);
  const allSpecs = [...azureSpecs, ...standardSpecs];

  const groups = buildTaskGroups(allSpecs, flags, ctx);

  // Forward `use-pyodide` to the emitter for every task. Done here (rather than
  // in regenerate-common.ts) so the shared file stays identical to the upstream
  // `@typespec/http-client-python` copy synced via `pnpm sync`. Pyodide runs
  // codegen + black in WASM, avoiding native black failing on Windows under the
  // deep pnpm venv path (MAX_PATH).
  if (usePyodide) {
    for (const group of groups) {
      for (const task of group.tasks) {
        task.options["use-pyodide"] = true;
      }
    }
  }

  const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0);

  console.log(pc.cyan(`Found ${allSpecs.length} specs (${totalTasks} total tasks) to compile`));
  console.log(pc.cyan(`Using ${jobs} parallel jobs\n`));

  const startTime = performance.now();
  const results = await runParallel(groups, jobs, ctx);
  const duration = (performance.now() - startTime) / 1000;

  const succeeded = Array.from(results.values()).filter((v) => v).length;
  const failed = results.size - succeeded;

  console.log(pc.cyan(`\n${"=".repeat(60)}`));
  console.log(pc.cyan(`Results: ${succeeded} succeeded, ${failed} failed`));
  console.log(pc.cyan(`Time: ${duration.toFixed(1)}s`));
  console.log(pc.cyan(`${"=".repeat(60)}\n`));

  return failed === 0;
}

async function main(): Promise<void> {
  const isWindows = platform() === "win32";
  const flavor = argv.values.flavor;
  const name = argv.values.name;
  const debug = argv.values.debug ?? false;
  const usePyodide = argv.values["use-pyodide"] ?? false;
  // Windows has slower file system operations and process spawning, so use
  // fewer parallel jobs to avoid I/O contention and memory pressure.
  const defaultJobs = isWindows ? 10 : 30;
  const jobs = argv.values.jobs ? parseInt(argv.values.jobs, 10) : defaultJobs;

  console.log(pc.cyan(`\nRegeneration config:`));
  console.log(pc.cyan(`  Platform: ${isWindows ? "Windows" : "Unix"}`));
  console.log(pc.cyan(`  Mode:     in-process compilation (single-phase)`));
  console.log(pc.cyan(`  Jobs:     ${jobs}`));
  if (usePyodide) {
    console.log(pc.cyan(`  Codegen:  pyodide (WASM)`));
  }
  if (name) {
    console.log(pc.cyan(`  Filter:   ${name}`));
  }
  console.log();

  const startTime = performance.now();
  let success: boolean;

  // The baseline reset clones azure-sdk-for-python and seeds tests/generated for
  // the full-emit smoke test. The emitter-diff tool wants only freshly generated
  // output (no network seed), so it passes --no-baseline.
  if (!argv.values["no-baseline"]) {
    await prepareBaselineOfGeneratedCode(GENERATED_FOLDER);
  }

  if (flavor) {
    success = await regenerateFlavor(flavor, name, debug, jobs, usePyodide);
  } else {
    const azureSuccess = await regenerateFlavor("azure", name, debug, jobs, usePyodide);
    const unbrandedSuccess = await regenerateFlavor("unbranded", name, debug, jobs, usePyodide);
    success = azureSuccess && unbrandedSuccess;
  }

  const totalDuration = (performance.now() - startTime) / 1000;
  console.log(
    success
      ? pc.green(`\nRegeneration completed successfully in ${totalDuration.toFixed(1)}s`)
      : pc.red(`\nRegeneration failed after ${totalDuration.toFixed(1)}s`),
  );

  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error(pc.red(`\nUnexpected error: ${String(err)}`));
  process.exit(1);
});
