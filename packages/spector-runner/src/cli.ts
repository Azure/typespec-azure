/* eslint-disable no-console */
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { compileScenarios } from "./compiler.js";
import { loadConfigFile, runConfig } from "./config.js";
import { runScenarioHook, runScenarioHooks } from "./hooks.js";
import { loadSpectorConfig } from "./loader.js";
import { buildScenarios } from "./run.js";
import { TaskRunner } from "./task-runner.js";
import type { SpecOptionValue } from "./types.js";

const USAGE = `Usage:
  spector-runner --config <spector.config.yaml> [--specs-root <dir>] [--emit <emitter>] [--phase <phase>] [options]
  spector-runner --config-file <spector-runner.config.js> [--filter <regex>] [--jobs <n>] [--cwd <dir>] [--verbose]

Compile every spec selected in one or more spector.config.yaml files in parallel
by spawning \`tsp compile\` for each, then run the config's per-instance hooks.

Config-file mode:
  --config-file <path>     A spector-runner.config.{js,ts} module that default-exports
                           a config (see defineConfig). Drives preRun/postScenario/postRun
                           hooks and lets one run combine multiple spec roots. A .ts config
                           needs a TS-capable runtime (run the CLI through \`tsx\`).

Flag mode (spector.config.yaml):
  --config <path>          Spector config file (repeatable).
  --specs-root <dir>       Root the spec-path keys are relative to. Defaults to the
                           config's \`specsRoot\`.
  --emit, --emitter <e>    Emitter package name or path (repeatable). Use '.' for the local
                           package. Optional when the config sets \`compileConfig\`.
  --emitter-name <name>    Name used to namespace --option values. Default: read from the emit path's package.json.
  --output-dir <template>  emitter-output-dir template. Placeholders: {path} {dir} {parentDir} {outputPath} {options.NAME}.
                           Defaults to the config's \`outputDir\`.
  --option <key=value>     Default emitter option (repeatable); per-spec config options override these.
  --tspconfig <path>       Stub tspconfig.yaml passed as --config to every compile.
  --phase <phase>          Which lifecycle phase(s) to run: 'all' (default), 'compile'
                           (compile + postCompile hook) or 'declarations' (the
                           postCompileDeclarations hook only, no recompile).

Shared options:
  --cwd <dir>              Directory to run compiles/hooks in and resolve the local tsp CLI + emitter. Default: process.cwd().
  --jobs <n>               Max concurrent compiles. Default: CPU count.
  --filter <regex>         Only run scenarios whose name matches this regex.
  --verbose                Print output for every scenario, not just failures.
  --help                   Show this help.`;

function parseOptionPairs(pairs: string[]): Record<string, SpecOptionValue> {
  const out: Record<string, SpecOptionValue> = {};
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq < 0) {
      throw new Error(`Invalid --option '${pair}', expected key=value.`);
    }
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}

type Phase = "all" | "compile" | "declarations";

function parsePhase(value: string | undefined): Phase {
  const phase = value ?? "all";
  if (phase !== "all" && phase !== "compile" && phase !== "declarations") {
    throw new Error(`Invalid --phase '${phase}'. Expected 'all', 'compile' or 'declarations'.`);
  }
  return phase;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "config-file": { type: "string" },
      config: { type: "string", multiple: true },
      "specs-root": { type: "string" },
      emit: { type: "string", multiple: true },
      emitter: { type: "string", multiple: true },
      "emitter-name": { type: "string" },
      "output-dir": { type: "string" },
      option: { type: "string", multiple: true },
      tspconfig: { type: "string" },
      phase: { type: "string" },
      cwd: { type: "string" },
      jobs: { type: "string" },
      filter: { type: "string" },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(USAGE);
    return 0;
  }

  const jobs = values.jobs !== undefined ? Number(values.jobs) : undefined;

  if (values["config-file"] !== undefined) {
    const config = await loadConfigFile(resolve(values["config-file"]));
    const summary = await runConfig(config, {
      jobs,
      cwd: values.cwd,
      verbose: values.verbose,
      filter: values.filter,
    });
    return summary.failed > 0 ? 1 : 0;
  }

  const configPaths = values.config ?? [];
  if (configPaths.length === 0) {
    throw new Error(`At least one --config <spector.config.yaml> is required.\n\n${USAGE}`);
  }
  const cwd = values.cwd ? resolve(values.cwd) : process.cwd();

  // Top-level settings (specsRoot/outputDir/compileConfig/hooks) come from the
  // first config; matching CLI flags override where provided.
  const topConfig = loadSpectorConfig(configPaths[0]);

  const specsRootValue = values["specs-root"] ?? topConfig.specsRoot;
  if (specsRootValue === undefined) {
    throw new Error(`--specs-root <dir> (or a config 'specsRoot') is required.\n\n${USAGE}`);
  }
  const specsRoot = resolve(cwd, specsRootValue);
  const compileConfig = topConfig.compileConfig;
  const outputDir = values["output-dir"] ?? topConfig.outputDir;
  const hooks = topConfig.hooks ?? {};

  const emit = [...(values.emit ?? []), ...(values.emitter ?? [])];
  if (emit.length === 0 && compileConfig === undefined) {
    throw new Error(
      `At least one --emit <emitter> (or a config 'compileConfig') is required.\n\n${USAGE}`,
    );
  }

  const phase = parsePhase(values.phase);

  const scenarios = buildScenarios({
    config: configPaths,
    specsRoot,
    emit,
    emitterName: values["emitter-name"],
    outputDir,
    compileConfig,
    options: parseOptionPairs(values.option ?? []),
    tspconfig: values.tspconfig,
    cwd,
    jobs,
    filter: values.filter,
    verbose: values.verbose,
  });

  const runner = new TaskRunner({ verbose: values.verbose });
  let failures = 0;

  if (phase === "all" || phase === "compile") {
    let hookFailures = 0;
    const summary = await compileScenarios(scenarios, {
      jobs,
      cwd,
      verbose: values.verbose,
      config: values.tspconfig,
      runner,
      onScenarioComplete: hooks.postCompile
        ? async (result) => {
            if (result.success) {
              const ok = await runScenarioHook(hooks.postCompile!, result.scenario, {
                cwd,
                phase: "compile",
                verbose: values.verbose,
                runner,
              });
              if (!ok) hookFailures++;
            }
          }
        : undefined,
    });
    failures += summary.failed + hookFailures;
  }

  if (phase === "all" || phase === "declarations") {
    if (hooks.postCompileDeclarations) {
      const summary = await runScenarioHooks(hooks.postCompileDeclarations, scenarios, {
        cwd,
        phase: "declarations",
        jobs,
        verbose: values.verbose,
      });
      failures += summary.failed;
    } else if (phase === "declarations") {
      console.warn("No 'postCompileDeclarations' hook configured; nothing to run.");
    }
  }

  return failures > 0 ? 1 : 0;
}
