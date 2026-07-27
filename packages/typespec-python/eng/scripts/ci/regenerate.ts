/* eslint-disable no-console */
/**
 * Regenerates Python SDK code from TypeSpec definitions.
 *
 * Spec selection comes from `spector.config.yaml` (see Azure/typespec-azure#4997);
 * per-spec emitter options and output layout come from the upstream-synced tables
 * in `regenerate-common.ts`. Each resulting task is compiled by spawning a
 * `tsp compile` subprocess through the shared `@azure-tools/spector-runner`
 * engine, so this wrapper and the Go/TS wrappers share one parallel-compile +
 * reporting engine (the engine is intended to move into `core/` and be reused
 * by upstream `@typespec/http-client-python`).
 */

import { platform } from "os";
import { dirname, relative, resolve } from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

import type { CompileScenario, SpectorRunnerConfig } from "@azure-tools/spector-runner";
import {
  isSpecEnabled,
  loadSpectorConfig,
  runConfig,
  SpectorConfig,
} from "@azure-tools/spector-runner";
import { rmSync } from "fs";

import {
  buildTaskGroups,
  defaultPackageName,
  getSubdirectories,
  prepareBaselineOfGeneratedCode,
  preprocess,
  RegenerateContext,
  RegenerateFlags,
  TaskGroup,
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
    jobs: { type: "string", short: "j" },
    help: { type: "boolean", short: "h" },
  },
});

if (argv.values.help) {
  console.log(`
${pc.bold("Usage:")} tsx regenerate.ts [options]

${pc.bold("Description:")}
  Regenerates Python SDK code from TypeSpec definitions. Each spec is compiled
  by spawning a \`tsp compile\` subprocess through the shared spector-runner
  engine, run in parallel across specs.

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
const AZURE_HTTP_SPECS = resolve(PLUGIN_DIR, "node_modules/@azure-tools/azure-http-specs/specs");
const HTTP_SPECS = resolve(PLUGIN_DIR, "node_modules/@typespec/http-specs/specs");
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

// Opt-in spec selection (see Azure/typespec-azure#4997). Only specs listed
// with a truthy value in spector.config.yaml are generated; anything discovered on
// disk but not opted in is skipped. Per-spec emitter options still come from the
// upstream-synced option tables in regenerate-common.ts.
const spectorConfig: SpectorConfig = loadSpectorConfig(resolve(PLUGIN_DIR, "spector.config.yaml"));

function toPosix(p: string): string {
  return p.split("\\").join("/");
}

/** Spec-path key matching `getEmitterOptions`'s key computation. */
function specKey(spec: string): string {
  const specDir = spec.includes("azure-http-specs") ? AZURE_HTTP_SPECS : HTTP_SPECS;
  const relativeSpec = toPosix(relative(specDir, spec));
  return relativeSpec.includes("resiliency/srv-driven/old.tsp")
    ? relativeSpec
    : dirname(relativeSpec);
}

/** Keep only specs opted into via spector.config.yaml. */
function filterOptedIn(specs: string[]): { kept: string[]; skipped: string[] } {
  const kept: string[] = [];
  const skipped: string[] = [];
  for (const spec of specs) {
    (isSpecEnabled(spectorConfig, specKey(spec)) ? kept : skipped).push(spec);
  }
  return { kept, skipped };
}

/**
 * Flatten the upstream {@link buildTaskGroups} output into shared-engine
 * {@link CompileScenario}s: one scenario per task. Each spec's option-sets and
 * output dirs come from `buildTaskGroups` (upstream-synced data); this only maps
 * that data onto the scenario shape the engine compiles.
 */
function groupsToScenarios(groups: TaskGroup[], ctx: RegenerateContext): CompileScenario[] {
  const scenarios: CompileScenario[] = [];
  for (const group of groups) {
    for (const task of group.tasks) {
      const packageName =
        (task.options["package-name"] as string) || defaultPackageName(group.spec, ctx);
      scenarios.push({
        name: packageName,
        entrypoint: task.spec,
        emit: [ctx.pluginDir],
        options: { [ctx.emitterName]: task.options },
      });
    }
  }
  return scenarios;
}

async function regenerateFlavor(
  flavor: string,
  name: string | undefined,
  debug: boolean,
  jobs: number,
): Promise<boolean> {
  console.log(pc.cyan(`\n${"=".repeat(60)}`));
  console.log(pc.cyan(`Regenerating ${flavor} flavor`));
  console.log(pc.cyan(`${"=".repeat(60)}\n`));

  const flags: RegenerateFlags = { flavor, debug, name };

  // Drive this flavor through the shared @azure-tools/spector-runner engine:
  // `preRun` prepares the generator, the scenario builder expands the
  // upstream-synced task groups, and `postScenario` wipes partial output on a
  // failure (matching the previous in-process behavior).
  const config: SpectorRunnerConfig = {
    cwd: ctx.pluginDir,
    jobs,
    preRun: () => preprocess(flavor, GENERATED_FOLDER),
    scenarios: async () => {
      const azureSpecs = flavor === "azure" ? await getSubdirectories(AZURE_HTTP_SPECS, flags) : [];
      const standardSpecs = await getSubdirectories(HTTP_SPECS, flags);
      const { kept, skipped } = filterOptedIn([...azureSpecs, ...standardSpecs]);
      if (skipped.length > 0) {
        console.log(
          pc.yellow(`Skipping ${skipped.length} spec(s) not opted into spector.config.yaml`),
        );
      }

      const groups = buildTaskGroups(kept, flags, ctx);
      const scenarios = groupsToScenarios(groups, ctx);
      console.log(
        pc.cyan(`Found ${kept.length} specs (${scenarios.length} total tasks) to compile`),
      );
      console.log(pc.cyan(`Using ${jobs} parallel jobs\n`));
      return scenarios;
    },
    postScenario: (result) => {
      if (!result.success) {
        // Match the previous in-process behavior: wipe partial output on failure.
        const outputDir = result.scenario.options?.[ctx.emitterName]?.["emitter-output-dir"] as
          string | undefined;
        if (outputDir) {
          rmSync(outputDir, { recursive: true, force: true });
        }
      }
    },
  };

  const startTime = performance.now();
  const summary = await runConfig(config, { jobs });
  const duration = (performance.now() - startTime) / 1000;

  console.log(pc.cyan(`\n${"=".repeat(60)}`));
  console.log(pc.cyan(`Results: ${summary.succeeded} succeeded, ${summary.failed} failed`));
  console.log(pc.cyan(`Time: ${duration.toFixed(1)}s`));
  console.log(pc.cyan(`${"=".repeat(60)}\n`));

  return summary.failed === 0;
}

async function main(): Promise<void> {
  const isWindows = platform() === "win32";
  const flavor = argv.values.flavor;
  const name = argv.values.name;
  const debug = argv.values.debug ?? false;
  // Windows has slower file system operations and process spawning, so use
  // fewer parallel jobs to avoid I/O contention and memory pressure.
  const defaultJobs = isWindows ? 10 : 30;
  const jobs = argv.values.jobs ? parseInt(argv.values.jobs, 10) : defaultJobs;

  console.log(pc.cyan(`\nRegeneration config:`));
  console.log(pc.cyan(`  Platform: ${isWindows ? "Windows" : "Unix"}`));
  console.log(pc.cyan(`  Mode:     tsp compile subprocess (spector-runner engine)`));
  console.log(pc.cyan(`  Jobs:     ${jobs}`));
  if (name) {
    console.log(pc.cyan(`  Filter:   ${name}`));
  }
  console.log();

  const startTime = performance.now();
  let success: boolean;

  await prepareBaselineOfGeneratedCode(GENERATED_FOLDER);

  if (flavor) {
    success = await regenerateFlavor(flavor, name, debug, jobs);
  } else {
    const azureSuccess = await regenerateFlavor("azure", name, debug, jobs);
    const unbrandedSuccess = await regenerateFlavor("unbranded", name, debug, jobs);
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
