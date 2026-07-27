/* eslint-disable no-console */
import { spawn } from "child_process";
import { existsSync } from "fs";
import { availableParallelism } from "os";
import { dirname, join } from "path";
import pc from "picocolors";
import { runWithConcurrency } from "./concurrency.js";
import { TaskRunner } from "./task-runner.js";

/**
 * A single scenario to compile: one TypeSpec entrypoint emitted with a given
 * set of emitters and options.
 */
export interface CompileScenario {
  /** Unique, human-readable label used in logs (e.g. module name or spec path). */
  readonly name: string;
  /** Spec-path key this scenario came from (exposed to hooks as `SPECTOR_SPEC_PATH`). */
  readonly specPath?: string;
  /** Absolute path to the TypeSpec entrypoint (a `.tsp` file). */
  readonly entrypoint: string;
  /** Emitter package name(s) or absolute path(s) to run (`--emit`). */
  readonly emit: readonly string[];
  /**
   * Working directory to spawn this scenario's `tsp compile` in, overriding the
   * run-wide {@link CompileScenariosOptions.cwd}. Use it when each scenario must
   * run in its own output folder (e.g. a committed per-output `tspconfig.yaml`
   * resolved relative to it). The `tsp` CLI is still located from the run-wide
   * cwd, so a local `node_modules/.bin/tsp` there is enough for every scenario.
   */
  readonly cwd?: string;
  /**
   * Emitter options, keyed by emitter *name* (not path). Each entry becomes a
   * `--option=<emitter>.<key>=<value>` CLI argument.
   */
  readonly options?: Readonly<Record<string, Record<string, unknown>>>;
  /** Extra raw CLI arguments appended to `tsp compile`. */
  readonly args?: readonly string[];
}

/** Outcome of compiling a single {@link CompileScenario}. */
export interface CompileScenarioResult {
  readonly scenario: CompileScenario;
  readonly status: "pass" | "fail";
  /** `true` when `tsp compile` exited with code 0. */
  readonly success: boolean;
  /** Combined stdout + stderr of the `tsp compile` subprocess. */
  readonly output: string;
  /** Wall-clock duration of this compilation, in milliseconds. */
  readonly durationMs: number;
}

export interface CompileScenariosOptions {
  /**
   * Maximum number of `tsp compile` subprocesses running at once.
   * Defaults to the number of available CPUs.
   */
  readonly jobs?: number;
  /** Show output for every scenario, not just failures. Defaults to CI detection. */
  readonly verbose?: boolean;
  /**
   * Working directory the subprocesses run in. Also the starting point used to
   * resolve the local `tsp` CLI (`node_modules/.bin/tsp`). Defaults to
   * `process.cwd()`.
   */
  readonly cwd?: string;
  /**
   * Path to a `tspconfig.yaml` passed as `--config` to every compile. Use a
   * stub config to stop an upstream `tspconfig.yaml` next to a spec from
   * bleeding emitter options into the output.
   */
  readonly config?: string;
  /** Reporter to use; defaults to a new {@link TaskRunner}. Pass one to share output styling. */
  readonly runner?: TaskRunner;
  /**
   * Called once each scenario finishes (success or failure), in completion
   * order. Use it for per-scenario post-processing (e.g. patching generated
   * metadata) or cleanup after a failure. May be async; it is awaited.
   */
  readonly onScenarioComplete?: (result: CompileScenarioResult) => void | Promise<void>;
}

/** Aggregate result of a {@link compileScenarios} run. */
export interface CompileScenariosSummary {
  readonly results: readonly CompileScenarioResult[];
  readonly succeeded: number;
  readonly failed: number;
  /** Total wall-clock duration of the whole run, in milliseconds. */
  readonly durationMs: number;
}

/**
 * Resolve the TypeSpec entrypoint for a spec-path key from a spector config.
 *
 * - A key ending in `.tsp` points directly at that entry file.
 * - Otherwise `client.tsp` is preferred over `main.tsp` (matching emitter behavior).
 *
 * @param root Absolute path to the specs root the key is relative to.
 * @param specPath Spec-path key from `spector.config.yaml`.
 */
export function resolveSpecEntrypoint(root: string, specPath: string): string {
  if (specPath.endsWith(".tsp")) {
    return join(root, specPath);
  }
  const client = join(root, specPath, "client.tsp");
  if (existsSync(client)) {
    return client;
  }
  return join(root, specPath, "main.tsp");
}

/** Locate the local `tsp` CLI by walking up from `cwd` (preferLocal behavior). */
function resolveTspBin(cwd: string): string {
  const binName = process.platform === "win32" ? "tsp.cmd" : "tsp";
  let dir = cwd;
  for (;;) {
    const bin = join(dir, "node_modules", ".bin", binName);
    if (existsSync(bin)) {
      return bin;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Could not find the 'tsp' CLI in any 'node_modules/.bin' starting from '${cwd}'. ` +
          `Ensure '@typespec/compiler' is installed.`,
      );
    }
    dir = parent;
  }
}

function formatOptionValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Build the `tsp compile ...` argument list for a scenario. */
function buildCompileArgs(scenario: CompileScenario, config?: string): string[] {
  const args = ["compile", scenario.entrypoint];
  for (const emitter of scenario.emit) {
    args.push(`--emit=${emitter}`);
  }
  if (scenario.options) {
    for (const [emitter, opts] of Object.entries(scenario.options)) {
      for (const [key, value] of Object.entries(opts)) {
        args.push(`--option=${emitter}.${key}=${formatOptionValue(value)}`);
      }
    }
  }
  if (config) {
    args.push(`--config=${config}`);
  }
  if (scenario.args) {
    args.push(...scenario.args);
  }
  return args;
}

/** Spawn `tsp compile` for one scenario and capture its combined output. */
function compileScenario(
  scenario: CompileScenario,
  tspBin: string,
  cwd: string,
  config: string | undefined,
): Promise<CompileScenarioResult> {
  const start = performance.now();
  const args = buildCompileArgs(scenario, config);
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (pc.isColorSupported) {
    env.FORCE_COLOR = "1";
  }

  return new Promise((resolve) => {
    const child = spawn(tspBin, args, {
      cwd: scenario.cwd ?? cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env,
    });

    let output = "";
    child.stdout?.on("data", (data) => (output += data.toString()));
    child.stderr?.on("data", (data) => (output += data.toString()));

    const finish = (success: boolean, extra = ""): void => {
      resolve({
        scenario,
        status: success ? "pass" : "fail",
        success,
        output: output + extra,
        durationMs: performance.now() - start,
      });
    };

    child.on("error", (error) => finish(false, `\nFailed to spawn 'tsp': ${String(error)}`));
    child.on("close", (code) => finish(code === 0));
  });
}

/**
 * Compile a set of scenarios in parallel by spawning one `tsp compile`
 * subprocess per scenario, running up to `jobs` at a time. This mirrors how the
 * emitters previously drove regeneration (and `@typespec/tsp-integration`), so
 * the reporting engine can be shared.
 *
 * Failures never reject: the returned summary reports which scenarios failed.
 */
export async function compileScenarios(
  scenarios: readonly CompileScenario[],
  options: CompileScenariosOptions = {},
): Promise<CompileScenariosSummary> {
  const jobs = Math.max(1, options.jobs ?? availableParallelism());
  const cwd = options.cwd ?? process.cwd();
  const runner = options.runner ?? new TaskRunner({ verbose: options.verbose });
  const results: CompileScenarioResult[] = [];
  const start = performance.now();

  if (scenarios.length > 0) {
    const tspBin = resolveTspBin(cwd);
    await runWithConcurrency([...scenarios], jobs, async (scenario) => {
      const result = await compileScenario(scenario, tspBin, cwd, options.config);
      results.push(result);
      const seconds = (result.durationMs / 1000).toFixed(1);
      runner.reportTaskWithDetails(
        result.status,
        `${scenario.name} ${pc.dim(`(${seconds}s)`)}`,
        result.output,
      );
      await options.onScenarioComplete?.(result);
      return result;
    });
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.length - succeeded;
  printSummary(results, succeeded, failed);

  return { results, succeeded, failed, durationMs: performance.now() - start };
}

function printSummary(
  results: readonly CompileScenarioResult[],
  succeeded: number,
  failed: number,
): void {
  console.log(`\n=== Summary ===`);
  const passed = pc.bold(pc.green(`${succeeded} passed`));
  const failedStr = failed > 0 ? pc.bold(pc.red(`${failed} failed`)) : undefined;
  console.log(
    [passed, failedStr].filter(Boolean).join(pc.gray(" | ")),
    pc.gray(`(${results.length})`),
  );

  if (failed > 0) {
    console.log("\nFailed scenarios:");
    for (const result of results) {
      if (!result.success) {
        console.log(`  - ${result.scenario.name}`);
      }
    }
  }
}
