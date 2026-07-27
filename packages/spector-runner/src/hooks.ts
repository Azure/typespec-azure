/* eslint-disable no-console */
import { spawn } from "child_process";
import { availableParallelism } from "os";
import pc from "picocolors";
import type { CompileScenario } from "./compiler.js";
import { runWithConcurrency } from "./concurrency.js";
import { TaskRunner } from "./task-runner.js";

/** Settings shared by every hook invocation in a run. */
export interface HookRunOptions {
  /** Working directory hook commands run in (also where the local CLI resolves). */
  readonly cwd: string;
  /** Name of the phase the hook runs in, exposed as `SPECTOR_PHASE`. */
  readonly phase: string;
  /** Max concurrent hook commands. Default: CPU count. */
  readonly jobs?: number;
  /** Show output for every scenario, not just failures. */
  readonly verbose?: boolean;
  /** Reporter to share output styling; defaults to a new {@link TaskRunner}. */
  readonly runner?: TaskRunner;
}

/** Environment a hook command receives on top of `process.env`. */
function hookEnv(scenario: CompileScenario, cwd: string, phase: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SPECTOR_OUTPUT_DIR: scenario.cwd ?? cwd,
    SPECTOR_SPEC_PATH: scenario.specPath ?? scenario.name,
    SPECTOR_SPEC_NAME: scenario.name,
    SPECTOR_PHASE: phase,
  };
  if (pc.isColorSupported) {
    env.FORCE_COLOR = "1";
  }
  return env;
}

/**
 * Run one hook command for one scenario, reporting the outcome through `runner`.
 * Never throws: returns `true` on exit code 0, `false` otherwise.
 */
export function runScenarioHook(
  command: string,
  scenario: CompileScenario,
  options: HookRunOptions,
): Promise<boolean> {
  const runner = options.runner ?? new TaskRunner({ verbose: options.verbose });
  const start = performance.now();

  return new Promise((resolve) => {
    const child = spawn(command, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
      env: hookEnv(scenario, options.cwd, options.phase),
    });

    let output = "";
    child.stdout?.on("data", (data) => (output += data.toString()));
    child.stderr?.on("data", (data) => (output += data.toString()));

    const finish = (success: boolean, extra = ""): void => {
      const seconds = ((performance.now() - start) / 1000).toFixed(1);
      runner.reportTaskWithDetails(
        success ? "pass" : "fail",
        `${scenario.name} ${pc.dim(`(${seconds}s)`)}`,
        output + extra,
      );
      resolve(success);
    };

    child.on("error", (error) => finish(false, `\nFailed to run hook: ${String(error)}`));
    child.on("close", (code) => finish(code === 0));
  });
}

/** Aggregate result of running a hook over many scenarios. */
export interface HookRunSummary {
  readonly succeeded: number;
  readonly failed: number;
}

/**
 * Run `command` once per scenario, up to `jobs` at a time, printing a summary.
 * Used for a phase that only runs a hook (e.g. `declarations`), without
 * recompiling. Failures never reject; inspect the returned `failed` count.
 */
export async function runScenarioHooks(
  command: string,
  scenarios: readonly CompileScenario[],
  options: HookRunOptions,
): Promise<HookRunSummary> {
  const jobs = Math.max(1, options.jobs ?? availableParallelism());
  const runner = options.runner ?? new TaskRunner({ verbose: options.verbose });
  let succeeded = 0;
  let failed = 0;

  await runWithConcurrency([...scenarios], jobs, async (scenario) => {
    const ok = await runScenarioHook(command, scenario, { ...options, runner });
    if (ok) {
      succeeded++;
    } else {
      failed++;
    }
  });

  console.log(`\n=== Summary (${options.phase}) ===`);
  const passed = pc.bold(pc.green(`${succeeded} passed`));
  const failedStr = failed > 0 ? pc.bold(pc.red(`${failed} failed`)) : undefined;
  console.log(
    [passed, failedStr].filter(Boolean).join(pc.gray(" | ")),
    pc.gray(`(${scenarios.length})`),
  );

  return { succeeded, failed };
}
