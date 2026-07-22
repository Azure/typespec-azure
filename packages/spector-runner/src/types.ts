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
 * Parsed `spector.config.yaml`. An opt-in allowlist: only specs listed with a
 * truthy value are generated.
 */
export interface SpectorConfig {
  specs: Record<string, SpecEntry>;
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
