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
