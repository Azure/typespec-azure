/**
 * Public types for the unified examples format (`examples.yaml`) and the `examples-validate`
 * diagnostics. These mirror the schema in `schema/examples-yaml.tsp`.
 */

/** Severity of an {@link ExampleDiagnostic}. */
export type DiagnosticSeverity = "error" | "warning";

/** A single validation diagnostic produced by {@link validateExampleFiles}. */
export interface ExampleDiagnostic {
  /** Machine-readable code (e.g. `invalid-status-code`). */
  readonly code: string;
  /** Human-readable message. */
  readonly message: string;
  /** Severity. Any `error` fails validation. */
  readonly severity: DiagnosticSeverity;
  /** Absolute or repo-relative path of the file the diagnostic applies to. */
  readonly file: string;
  /** 1-based line number, when a precise location is available. */
  readonly line?: number;
  /** 1-based column number, when a precise location is available. */
  readonly col?: number;
  /** The operation key the diagnostic relates to, when applicable. */
  readonly operation?: string;
}

/** A single example variant (`Example` in the schema). */
export interface ExampleVariant {
  readonly title?: string;
  readonly description?: string;
  readonly since?: string;
  readonly request?: ExampleRequest;
  readonly responses?: Record<string, ExampleResponse>;
}

export interface ExampleRequest {
  readonly path?: Record<string, unknown>;
  readonly query?: Record<string, unknown>;
  readonly headers?: Record<string, unknown>;
  readonly body?: unknown;
}

export interface ExampleResponse {
  readonly headers?: Record<string, unknown>;
  readonly body?: unknown;
}

/** Parsed representation of a service's `service.yaml` version metadata. */
export interface ServiceVersions {
  /** The set of API version strings declared in `service.yaml`, in file order. */
  readonly versions: string[];
}
