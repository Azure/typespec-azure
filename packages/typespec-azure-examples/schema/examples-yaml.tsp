/**
 * Source of truth for the `examples.yaml` unified examples format emitted/consumed by
 * Azure tooling. The JSON Schema generated from this file is published for editor and CI
 * validation and is used by the `examples-validate` tool (via ajv).
 *
 * See the RFC: Unified Examples Format (§3–§4).
 *
 * Note: because YAML permits arbitrary string keys, status codes, headers, query params, and
 * map-shaped bodies are modeled as `Record<...>`. Rules that JSON Schema cannot express
 * (integer-only status codes, quoted `since`, `since` ∈ `service.yaml`, per-lineage
 * uniqueness, file placement, `{api-version}`-only placeholder) are enforced by the
 * `examples-validate` semantic rules.
 */
import "@typespec/json-schema";

using JsonSchema;

/**
 * Top-level `examples.yaml` file: `$schema`/`$namespace` metadata plus one entry per
 * operation, keyed by the interface-relative operation name (e.g. `CaCertificates.get`).
 * Each operation maps to a list of example variants.
 *
 * The indexer is widened to `Example[] | string` so the `$`-prefixed string metadata keys
 * are structurally valid. The rules that a bare (non-`$`) key must be a list of examples and
 * that the only allowed metadata keys are `$schema`/`$namespace` are enforced by the
 * `examples-validate` semantic rules.
 */
@jsonSchema("examples.yaml")
model ExamplesYaml is Record<Example[] | string> {
  /** Schema URL. Gives editors autocomplete and inline validation while authoring. */
  $schema?: string;

  /**
   * Service namespace (e.g. `Microsoft.EventGrid`), prepended to each operation key to form
   * the fully-qualified operation identity used for Swagger linkage (`x-id`).
   */
  $namespace?: string;
}

/** A single example variant representing one complete API interaction. */
model Example {
  /**
   * Optional human-readable title. Omit for the single-example case; provide it only to
   * disambiguate multiple distinct examples on the same operation. Entries sharing a `title`
   * form one lineage; untitled entries all belong to the single default lineage.
   */
  title?: string;

  /** Longer description of what this example demonstrates. */
  description?: string;

  /**
   * Quoted version from which this variant applies (must be a version listed in the service's
   * `service.yaml`). Omit to apply from the earliest version.
   */
  since?: string;

  /** The request of the API interaction. */
  request: ExampleRequest;

  /** Responses keyed by integer status code (e.g. `200`, `404`). */
  responses: Record<ExampleResponse>;
}

/** The request portion of an example, split by parameter location. */
model ExampleRequest {
  /** Path parameters. `api-version` is implicit and MUST NOT be included. */
  path?: Record<unknown>;

  /** Query parameters (e.g. `$top`, `$filter`). */
  query?: Record<unknown>;

  /** Request headers (e.g. `If-Match`). */
  headers?: Record<unknown>;

  /** Request body. Structure matches the operation's request schema. */
  body?: unknown;
}

/** A single response of an example, keyed in the parent map by integer status code. */
model ExampleResponse {
  /** Response headers (e.g. `Location`, `Azure-AsyncOperation`). */
  headers?: Record<unknown>;

  /** Response body. Structure matches the operation's response schema. */
  body?: unknown;
}
