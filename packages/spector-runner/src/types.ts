/**
 * Value type for a single option passed to an emitter.
 */
export type SpecOptionValue = string | number | boolean;

/**
 * Opaque map of emitter option name -> value. The loader does not interpret
 * these; they are forwarded to the emitter as-is.
 */
export type SpecOptions = Record<string, SpecOptionValue>;

/**
 * Config value for a single spec entry:
 * - `true`  -> generate this spec, no options.
 * - `false` -> tracked skip (a YAML comment should document why).
 * - object  -> generate this spec with the given emitter options.
 * - array   -> generate this spec once per option-set (multiple outputs, e.g.
 *   the same spec compiled for two api-versions or two modules).
 */
export type SpecEntryOptions = { options?: SpecOptions };
export type SpecEntry = boolean | SpecEntryOptions | SpecEntryOptions[];

/**
 * Per-instance lifecycle hooks, declared as shell command strings. Each runs
 * once per selected spec, with the run's working directory as its `cwd` and the
 * scenario details exposed via environment variables (so a hook can stay a
 * short, reusable script):
 *
 * - `SPECTOR_OUTPUT_DIR` — absolute path to the spec's generated output folder.
 * - `SPECTOR_SPEC_PATH`  — the spec-path key from the config.
 * - `SPECTOR_SPEC_NAME`  — the scenario name (output sub-path or spec path).
 * - `SPECTOR_PHASE`      — the phase the hook is running in.
 */
export interface SpectorHooks {
  /** Runs after each successful `tsp compile` (the `compile`/`all` phases). */
  postCompile?: string;
  /**
   * Runs per spec in the `declarations` phase (and at the end of `all`), without
   * recompiling — for a follow-up build step over already-generated sources
   * (e.g. rolling up `.d.ts` with api-extractor).
   */
  postCompileDeclarations?: string;
}

/**
 * Parsed `spector.config.yaml`. An opt-in allowlist: only specs listed with a
 * truthy value are generated. The optional top-level keys let an emitter drive
 * its whole regeneration from the config file (via the bare `spector-runner`
 * CLI) instead of a bespoke JS driver.
 */
export interface SpectorConfig {
  specs: Record<string, SpecEntry>;
  /** Root the spec-path keys are relative to (a `--specs-root` default). */
  specsRoot?: string;
  /**
   * Template for each spec's output folder, resolved against the run cwd.
   * Placeholders: `{path}` (spec key), `{dir}`, `{parentDir}`, `{outputPath}`
   * (the `outputPath` option, defaulting to `{path}`) and `{options.NAME}`.
   */
  outputDir?: string;
  /**
   * Filename of a committed `tspconfig.yaml` inside each spec's output folder.
   * When set, every compile runs with its output folder as the cwd and this file
   * as `--config`, so the emitter + per-package options come from that committed
   * config (no synthesized `--emit`/`--option`).
   */
  compileConfig?: string;
  /** Per-instance lifecycle hooks (shell commands). */
  hooks?: SpectorHooks;
}

/**
 * A spec that resolved to "generate", together with its emitter options.
 */
export interface ResolvedSpec {
  /** Spec path key, relative to the specs root. */
  path: string;
  /** Emitter options for this spec (empty object when none were specified). */
  options: SpecOptions;
}

/**
 * Error thrown when a `spector.config.yaml` is structurally invalid.
 */
export class SpectorConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpectorConfigError";
  }
}
