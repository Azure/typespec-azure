/**
 * Source of truth for the `spector.config.yaml` format used to select which
 * spector spec files an emitter regenerates. The JSON Schema generated from
 * this file (via `@typespec/json-schema`) is used for editor and CI validation.
 *
 * Selection is opt-in: only specs listed with a truthy value are generated.
 * Tracking issue: https://github.com/Azure/typespec-azure/issues/4997
 */
import "@typespec/json-schema";

using JsonSchema;

@jsonSchema
model SpectorConfig {
  /** Map of spec path (relative to the specs root) to a selection. */
  specs: Record<SpecSelection>;

  /** Root the spec-path keys are relative to (a `--specs-root` default). */
  specsRoot?: string;

  /**
   * Template for each spec's output folder, resolved against the run cwd.
   * Placeholders: `{path}`, `{dir}`, `{parentDir}`, `{outputPath}` (the
   * `outputPath` option, defaulting to `{path}`) and `{options.NAME}`.
   */
  outputDir?: string;

  /**
   * Filename of a committed `tspconfig.yaml` inside each spec's output folder.
   * When set, every compile runs with that folder as its cwd and this file as
   * `--config`, so the emitter and per-package options come from the committed
   * config (no synthesized `--emit`/`--option`).
   */
  compileConfig?: string;

  /** Per-instance lifecycle hooks (shell commands). */
  hooks?: SpectorHooks;
}

/**
 * Per-instance lifecycle hooks, each a shell command run once per selected
 * spec. The scenario details are exposed via `SPECTOR_OUTPUT_DIR`,
 * `SPECTOR_SPEC_PATH`, `SPECTOR_SPEC_NAME` and `SPECTOR_PHASE` env vars.
 */
model SpectorHooks {
  /** Runs after each successful `tsp compile` (the `compile`/`all` phases). */
  postCompile?: string;

  /** Runs per spec in the `declarations` phase (and end of `all`), no recompile. */
  postCompileDeclarations?: string;
}

/**
 * How a single spec is selected:
 * - `true` — generate this spec (no options).
 * - `false` — tracked skip; document why in a YAML comment.
 * - an option-set — generate with custom emitter options.
 * - a list of option-sets — generate once per set (multiple outputs).
 */
alias SpecSelection = boolean | SpecOptionSet | SpecOptionSet[];

/** Generate a spec with a set of opaque, emitter-specific options. */
model SpecOptionSet {
  /** Map of emitter option name to value. */
  options?: Record<string | numeric | boolean>;
}
