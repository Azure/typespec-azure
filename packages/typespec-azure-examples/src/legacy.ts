import type { ResolvedExample } from "./resolve/resolve.js";

/**
 * A legacy `x-ms-examples` document reconstructed from a resolved unified example: the flat
 * `parameters` bag and the `responses` map, exactly as the classic per-version JSON files carry
 * them.
 */
export interface LegacyExample {
  readonly parameters: Record<string, unknown>;
  readonly responses: Record<string, unknown>;
}

interface RequestBuckets {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
}

/**
 * Reconstruct the legacy `x-ms-examples` shape from a resolved unified example. The unified `request`
 * buckets (`path` / `query` / `headers` / `body`) are flattened back into the single flat
 * `parameters` bag the classic format uses: the implicit `api-version` parameter is re-added, and the
 * request body is placed under the operation's body parameter name.
 *
 * This is the shared inverse of {@link transformExample} (the migration side) and the core of the
 * `typespec-autorest` emitter's legacy reconstruction, so both directions and both consumers agree.
 */
export function materializeLegacyExample(
  resolved: Pick<ResolvedExample, "request" | "responses">,
  options: { apiVersion: string; bodyParameterName?: string },
): LegacyExample {
  const request = (resolved.request ?? {}) as RequestBuckets;
  const parameters: Record<string, unknown> = { "api-version": options.apiVersion };

  for (const bucket of [request.path, request.query, request.headers]) {
    if (bucket && typeof bucket === "object") {
      Object.assign(parameters, bucket);
    }
  }

  if (request.body !== undefined) {
    parameters[options.bodyParameterName ?? "body"] = request.body;
  }

  const responses =
    resolved.responses && typeof resolved.responses === "object"
      ? (resolved.responses as Record<string, unknown>)
      : {};

  return { parameters, responses };
}
