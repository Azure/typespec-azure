import { availableParallelism } from "os";
import { pathToFileURL } from "url";
import type {
  CompileScenario,
  CompileScenarioResult,
  CompileScenariosSummary,
} from "./compiler.js";
import { compileScenarios } from "./compiler.js";

/**
 * Context passed to every hook and scenario builder. It reflects the run-wide
 * settings after CLI overrides have been applied, so hooks (e.g. a baseline
 * clone) and builders can adapt to the requested `filter`, `jobs`, etc.
 */
export interface RunHookContext {
  /** Working directory compiles run in and the local `tsp` CLI is resolved from. */
  readonly cwd: string;
  /** Max concurrent `tsp compile` subprocesses for this run. */
  readonly jobs: number;
  /** Whether output is printed for every scenario (not just failures). */
  readonly verbose: boolean;
  /** Scenario-name regex the run was filtered by, or `undefined` for "all". */
  readonly filter?: string;
}

/**
 * Lifecycle hooks an emitter can declare so its regeneration runs entirely
 * through the shared engine (the `spector-runner` CLI) instead of a bespoke
 * driver. Each hook may be async and is awaited.
 */
export interface RunHooks {
  /**
   * Runs once before any scenario compiles. Use for one-time setup an emitter
   * needs (syncing external spec repos, cloning a baseline of generated code,
   * clearing previous output, etc.).
   */
  readonly preRun?: (ctx: RunHookContext) => void | Promise<void>;
  /**
   * Runs once each scenario finishes (success or failure), in completion order.
   * Use for per-scenario post-processing (patching generated metadata, writing
   * a `.gitignore`) or cleanup after a failure.
   */
  readonly postScenario?: (
    result: CompileScenarioResult,
    ctx: RunHookContext,
  ) => void | Promise<void>;
  /**
   * Runs once after every scenario has finished. Use for a follow-up build step
   * that isn't a `tsp compile` (e.g. rolling up `.d.ts` with api-extractor).
   */
  readonly postRun?: (
    summary: CompileScenariosSummary,
    ctx: RunHookContext,
  ) => void | Promise<void>;
}

/**
 * A full regeneration run described declaratively. An emitter authors one of
 * these (a `spector-runner.config.{js,ts}` module that default-exports it) and
 * the shared `spector-runner` CLI drives it end-to-end: {@link RunHooks.preRun},
 * then all {@link scenarios} compiled in parallel, then {@link RunHooks.postRun}.
 *
 * Compose multiple spec roots / configs by calling {@link buildScenarios}
 * (exported by this package) several times inside {@link scenarios} and
 * concatenating the results.
 */
export interface SpectorRunnerConfig extends RunHooks {
  /**
   * The scenarios to compile, or a builder invoked with the run context. A
   * builder lets an emitter compute scenarios from external data (e.g. upstream
   * option tables) or skip expensive work when the run is filtered.
   */
  readonly scenarios:
    | readonly CompileScenario[]
    | ((ctx: RunHookContext) => readonly CompileScenario[] | Promise<readonly CompileScenario[]>);
  /** Max concurrent compiles. CLI `--jobs` overrides this; default: CPU count. */
  readonly jobs?: number;
  /** Working directory for compiles + `tsp` resolution. CLI `--cwd` overrides; default: `process.cwd()`. */
  readonly cwd?: string;
  /** Print output for every scenario. CLI `--verbose` overrides. */
  readonly verbose?: boolean;
  /** Only run scenarios whose name matches this regex. CLI `--filter` overrides. */
  readonly filter?: string;
  /** Stub `tspconfig.yaml` passed as `--config` to every compile (unless a scenario sets its own `--config`). */
  readonly tspconfig?: string;
}

/** Run-wide settings from the CLI that override the config's own values when set. */
export interface RunConfigOverrides {
  readonly jobs?: number;
  readonly cwd?: string;
  readonly verbose?: boolean;
  readonly filter?: string;
}

/**
 * Identity helper providing type-checking and editor completion when authoring
 * a `spector-runner.config.{js,ts}`:
 *
 * ```js
 * import { defineConfig, buildScenarios } from "@azure-tools/spector-runner";
 * export default defineConfig({ scenarios: (ctx) => buildScenarios({ ... }) });
 * ```
 */
export function defineConfig(config: SpectorRunnerConfig): SpectorRunnerConfig {
  return config;
}

/**
 * Dynamically import a config module and return its config. Accepts either a
 * default export or a `config` named export; both must be a
 * {@link SpectorRunnerConfig}. Note that a `.ts` config requires a TS-capable
 * runtime (Node with type-stripping, or run the CLI through `tsx`).
 */
export async function loadConfigFile(path: string): Promise<SpectorRunnerConfig> {
  const mod = (await import(pathToFileURL(path).href)) as {
    default?: unknown;
    config?: unknown;
  };
  const candidate = mod.default ?? mod.config;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    !("scenarios" in candidate) ||
    (candidate as SpectorRunnerConfig).scenarios === undefined
  ) {
    throw new Error(
      `Config module '${path}' must default-export a SpectorRunnerConfig with a 'scenarios' property. ` +
        `Use 'export default defineConfig({ scenarios: ... })'.`,
    );
  }
  return candidate as SpectorRunnerConfig;
}

/**
 * Drive a whole regeneration run from a {@link SpectorRunnerConfig}: resolve the
 * effective run settings (config values, then CLI `overrides`), invoke `preRun`,
 * build + optionally filter the scenarios, compile them in parallel (wiring
 * `postScenario` to the per-scenario completion hook), then invoke `postRun`.
 *
 * Failures never reject; inspect the returned summary's `failed` count.
 */
export async function runConfig(
  config: SpectorRunnerConfig,
  overrides: RunConfigOverrides = {},
): Promise<CompileScenariosSummary> {
  const cwd = overrides.cwd ?? config.cwd ?? process.cwd();
  const jobs = Math.max(1, overrides.jobs ?? config.jobs ?? availableParallelism());
  const verbose = overrides.verbose ?? config.verbose ?? false;
  const filter = overrides.filter ?? config.filter;
  const ctx: RunHookContext = { cwd, jobs, verbose, filter };

  await config.preRun?.(ctx);

  const built =
    typeof config.scenarios === "function" ? await config.scenarios(ctx) : config.scenarios;
  let scenarios = [...built];
  if (filter !== undefined) {
    const regex = new RegExp(filter);
    scenarios = scenarios.filter((scenario) => regex.test(scenario.name));
  }

  const summary = await compileScenarios(scenarios, {
    jobs,
    cwd,
    verbose,
    config: config.tspconfig,
    onScenarioComplete: config.postScenario
      ? (result) => config.postScenario!(result, ctx)
      : undefined,
  });

  await config.postRun?.(summary, ctx);

  return summary;
}
