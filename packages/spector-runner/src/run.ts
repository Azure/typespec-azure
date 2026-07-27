import { existsSync, readFileSync } from "fs";
import { isAbsolute, join, resolve } from "path";
import type { CompileScenario, CompileScenariosSummary } from "./compiler.js";
import { compileScenarios, resolveSpecEntrypoint } from "./compiler.js";
import { loadSpectorConfig, resolveSpecs } from "./loader.js";
import type { SpecOptions, SpecOptionValue } from "./types.js";

export interface SpectorRunnerOptions {
  /** One or more `spector.config.yaml` paths whose specs share {@link specsRoot}. */
  readonly config: string | readonly string[];
  /** Root the spec-path keys are relative to (e.g. the http-specs `specs` dir). */
  readonly specsRoot: string;
  /** Emitter package name(s) or path(s) passed to `tsp --emit`. Paths are resolved against {@link cwd}. */
  readonly emit: readonly string[];
  /**
   * Compile each spec using the committed `tspconfig.yaml` (this filename) inside
   * its output folder: the compile runs with that folder as its cwd and this file
   * as `--config`, and no `--emit`/`--option` are synthesized. Requires
   * {@link outputDir} to locate each folder.
   */
  readonly compileConfig?: string;
  /**
   * Emitter *name* used to namespace options (`--option <name>.<key>=<value>`).
   * Defaults to the package name read from the first path-like {@link emit} entry.
   */
  readonly emitterName?: string;
  /**
   * Template for each scenario's `emitter-output-dir`, resolved against {@link cwd}.
   * Placeholders: `{path}` (spec key), `{dir}` (its directory, `.tsp` file stripped),
   * `{parentDir}` (`{dir}` minus its last segment) and `{options.NAME}` (a spec option).
   * When omitted, the compiler's default output dir is used.
   */
  readonly outputDir?: string;
  /** Default emitter options; per-spec config options override these by key. */
  readonly options?: Readonly<Record<string, SpecOptionValue>>;
  /** Stub `tspconfig.yaml` passed as `--config` to every compile. */
  readonly tspconfig?: string;
  /** Working directory for compiles, output-dir resolution, and `tsp` lookup. Default `process.cwd()`. */
  readonly cwd?: string;
  /** Max concurrent `tsp compile` subprocesses. Default: CPU count. */
  readonly jobs?: number;
  /** Only run scenarios whose name matches this regex (tested against the scenario name). */
  readonly filter?: string;
  readonly verbose?: boolean;
  /** Extra scenarios (e.g. an emitter's local specs) appended to the config-derived ones. */
  readonly extraScenarios?: readonly CompileScenario[];
  /** Per-scenario completion hook (post-processing/cleanup), forwarded to the compiler. */
  readonly onScenarioComplete?: (result: {
    readonly scenario: CompileScenario;
    readonly success: boolean;
  }) => void | Promise<void>;
}

function isPathLike(value: string): boolean {
  return value.startsWith(".") || isAbsolute(value);
}

/** Resolve an `--emit` value: path-like entries become absolute, package names pass through. */
function resolveEmit(emit: string, cwd: string): string {
  return isPathLike(emit) ? resolve(cwd, emit) : emit;
}

/** Read the emitter package name from a resolved emit value. */
function deriveEmitterName(emit: string): string {
  if (isAbsolute(emit)) {
    const pkgJson = join(emit, "package.json");
    if (existsSync(pkgJson)) {
      const name = JSON.parse(readFileSync(pkgJson, "utf8")).name;
      if (typeof name === "string" && name.length > 0) {
        return name;
      }
    }
    throw new Error(
      `Could not determine the emitter name from '${emit}'. Pass 'emitterName' (or --emitter-name) explicitly.`,
    );
  }
  return emit;
}

/** Fill an output-dir template for one spec. See {@link SpectorRunnerOptions.outputDir}. */
export function formatOutputDir(template: string, path: string, options: SpecOptions): string {
  const dir = path.endsWith(".tsp") ? path.slice(0, path.lastIndexOf("/")) : path;
  const slash = dir.lastIndexOf("/");
  const parentDir = slash < 0 ? "" : dir.slice(0, slash);
  return template.replace(
    /\{(path|dir|parentDir|outputPath|options\.[\w-]+)\}/g,
    (_, key: string) => {
      if (key === "path") return path;
      if (key === "dir") return dir;
      if (key === "parentDir") return parentDir;
      // `{outputPath}` is the `outputPath` option, defaulting to the spec key.
      if (key === "outputPath") {
        return options.outputPath === undefined ? path : String(options.outputPath);
      }
      const name = key.slice("options.".length);
      if (options[name] === undefined) {
        throw new Error(
          `Output-dir template '{${key}}' references missing option '${name}' for spec '${path}'.`,
        );
      }
      return String(options[name]);
    },
  );
}

/** Translate spector config(s) into {@link CompileScenario}s for {@link compileScenarios}. */
export function buildScenarios(options: SpectorRunnerOptions): CompileScenario[] {
  const cwd = options.cwd ?? process.cwd();
  const configs = Array.isArray(options.config) ? options.config : [options.config];
  const compileConfig = options.compileConfig;
  const emit = options.emit.map((e) => resolveEmit(e, cwd));
  // In compileConfig mode the emitter + options come from each output folder's
  // committed config, so an emitter name is only needed when we synthesize
  // `--option` values ourselves.
  const emitterName =
    emit.length > 0 ? (options.emitterName ?? deriveEmitterName(emit[0])) : undefined;
  const filter = options.filter ? new RegExp(options.filter) : undefined;

  const scenarios: CompileScenario[] = [];
  for (const configPath of configs) {
    for (const { path, options: specOptions } of resolveSpecs(loadSpectorConfig(configPath))) {
      const name =
        specOptions.module !== undefined
          ? String(specOptions.module)
          : specOptions.outputPath !== undefined
            ? String(specOptions.outputPath)
            : path;
      if (filter && !filter.test(name)) {
        continue;
      }
      const entrypoint = resolveSpecEntrypoint(options.specsRoot, path);

      if (compileConfig !== undefined) {
        if (options.outputDir === undefined) {
          throw new Error(`compileConfig requires an outputDir template to locate '${name}'.`);
        }
        const outputDir = resolve(cwd, formatOutputDir(options.outputDir, path, specOptions));
        scenarios.push({
          name,
          specPath: path,
          entrypoint,
          emit,
          cwd: outputDir,
          args: ["--config", compileConfig],
        });
        continue;
      }

      const merged: Record<string, SpecOptionValue> = { ...options.options, ...specOptions };
      if (options.outputDir !== undefined) {
        merged["emitter-output-dir"] = resolve(
          cwd,
          formatOutputDir(options.outputDir, path, specOptions),
        );
      }
      scenarios.push({
        name,
        specPath: path,
        entrypoint,
        emit,
        options: { [emitterName!]: merged },
      });
    }
  }
  if (options.extraScenarios) {
    scenarios.push(...options.extraScenarios);
  }
  return scenarios;
}

/**
 * End-to-end driver: build scenarios from spector config(s) and compile them all
 * in parallel. This is what the `spector-runner` CLI calls; emitters that need
 * extra local specs or post-processing can call it directly with `extraScenarios`
 * and `onScenarioComplete`.
 */
export function runSpectorRunner(options: SpectorRunnerOptions): Promise<CompileScenariosSummary> {
  const scenarios = buildScenarios(options);
  return compileScenarios(scenarios, {
    jobs: options.jobs,
    cwd: options.cwd,
    config: options.tspconfig,
    verbose: options.verbose,
    onScenarioComplete: options.onScenarioComplete,
  });
}
