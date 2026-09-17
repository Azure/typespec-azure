import { stripJsonExtension } from "./naming.js";
import type { ResolvedExample } from "./resolve/resolve.js";

/**
 * A legacy `x-ms-examples` document reconstructed from a resolved unified example: the `title` and
 * `operationId` envelope, the flat `parameters` bag, and the `responses` map, exactly as the classic
 * per-version JSON files carry them (with `title` first, matching the dominant convention).
 */
export interface LegacyExample {
  readonly title: string;
  readonly operationId: string;
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
 * Reconstruct the full legacy `x-ms-examples` document from a resolved unified example. The unified
 * `request` buckets (`path` / `query` / `headers` / `body`) are flattened back into the single flat
 * `parameters` bag the classic format uses: the implicit `api-version` parameter is re-added, and the
 * request body is placed under the operation's body parameter name. The `x-ms-examples` `title`
 * defaults to the preserved title, else the preserved file name (sans extension), else the
 * `operationId` — the same rule the file name uses — so the envelope round-trips too.
 *
 * This is the shared inverse of {@link transformExample} (the migration side) and the core of the
 * `typespec-autorest` emitter's legacy reconstruction, so both directions and both consumers agree.
 */
export function materializeLegacyExample(
  resolved: Pick<ResolvedExample, "request" | "responses" | "title" | "legacyFilename">,
  options: { operationId: string; apiVersion: string; bodyParameterName?: string },
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

  const title =
    resolved.title ??
    (resolved.legacyFilename ? stripJsonExtension(resolved.legacyFilename) : undefined) ??
    options.operationId;

  return { title, operationId: options.operationId, parameters, responses };
}
