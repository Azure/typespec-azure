/**
 * Internal representation of a migrated example variant, prior to lineage assignment.
 * Mirrors the `Example` shape in the schema but is mutable while being assembled.
 */
export interface MigratedRequest {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
}

export interface MigratedResponse {
  headers?: Record<string, unknown>;
  body?: unknown;
}

export interface MigratedVariant {
  title?: string;
  since?: string;
  request: MigratedRequest;
  responses: Record<string, MigratedResponse>;
}
