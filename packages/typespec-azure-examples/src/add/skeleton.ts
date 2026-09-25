/**
 * Generate a minimal placeholder example value from a resolved JSON schema. Used by `add` when a
 * brand-new operation has no previous example to clone: the skeleton gives the author a correctly
 * shaped starting point to fill in.
 */

import type { OperationSignature } from "./signature.js";

type AnyRecord = Record<string, any>;

/** The unified `request`/`responses` skeleton for one operation, ready to drop into a variant. */
export interface ExampleSkeleton {
  readonly request: {
    path?: Record<string, unknown>;
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
    body?: unknown;
  };
  readonly responses: Record<string, { body?: unknown }>;
}

const MAX_DEPTH = 6;
/** The api-version parameter is implicit in the unified format and must not be scaffolded. */
const IMPLICIT_PARAMS = new Set(["api-version"]);
const SUCCESS_CODES = ["200", "201", "202", "204"];

/** Build a placeholder {@link ExampleSkeleton} from an operation's signature. */
export function skeletonForOperation(signature: OperationSignature): ExampleSkeleton {
  const request: ExampleSkeleton["request"] = {};

  for (const descriptor of Object.values(signature.parameters)) {
    const { name, in: location, schema } = descriptor;
    if (IMPLICIT_PARAMS.has(name.toLowerCase())) continue;
    const bucket =
      location === "path"
        ? (request.path ??= {})
        : location === "header"
          ? (request.headers ??= {})
          : (request.query ??= {});
    // Request bodies/params exclude read-only fields; response bodies keep them.
    bucket[name] = skeletonForSchema(schema, 0, false) ?? `<${name}>`;
  }

  if (signature.body !== undefined) {
    request.body = skeletonForSchema(signature.body, 0, false);
  }

  const responses: Record<string, { body?: unknown }> = {};
  // Only concrete 100–599 status codes can appear in a unified example; `default` and other
  // non-numeric response keys are excluded (the validator rejects them).
  const codes = Object.keys(signature.responses).filter((code) => /^[1-5]\d\d$/.test(code));
  const success = codes.filter((code) => SUCCESS_CODES.includes(code));
  for (const code of success.length > 0 ? success : codes.slice(0, 1)) {
    const entry = signature.responses[code] as { body?: unknown } | null;
    const body = entry?.body ?? null;
    // Response bodies keep read-only fields (`id`, `name`, `provisioningState`, ...) — exactly the
    // server-populated data a real example must show.
    responses[code] = body == null ? {} : { body: skeletonForSchema(body, 0, true) };
  }

  return { request, responses };
}

/**
 * Produce a minimal placeholder value for a resolved JSON schema node. When `keepReadOnly` is true
 * (response bodies) server-populated read-only properties are included; for request payloads they are
 * omitted.
 */
export function skeletonForSchema(schema: unknown, depth: number, keepReadOnly: boolean): unknown {
  if (depth > MAX_DEPTH || schema === null || typeof schema !== "object") return null;
  const node = schema as AnyRecord;

  if (node.$circularRef !== undefined || node.$unresolvedRef !== undefined) return null;
  if (Array.isArray(node.enum) && node.enum.length > 0) return node.enum[0];
  if (node.default !== undefined) return node.default;
  if (Array.isArray(node.allOf)) {
    return node.allOf.reduce<Record<string, unknown>>((acc, part) => {
      const value = skeletonForSchema(part, depth, keepReadOnly);
      return value && typeof value === "object" ? { ...acc, ...value } : acc;
    }, {});
  }

  const type = Array.isArray(node.type) ? node.type[0] : node.type;
  switch (type) {
    case "object":
    case undefined: {
      if (node.properties === undefined || typeof node.properties !== "object") {
        return type === "object" ? {} : null;
      }
      const required: string[] = Array.isArray(node.required) ? node.required : [];
      const out: Record<string, unknown> = {};
      for (const [name, propSchema] of Object.entries(node.properties as AnyRecord)) {
        if (
          !keepReadOnly &&
          (propSchema as AnyRecord)?.readOnly === true &&
          !required.includes(name)
        )
          continue;
        out[name] = skeletonForSchema(propSchema, depth + 1, keepReadOnly);
      }
      return out;
    }
    case "array":
      return [skeletonForSchema(node.items, depth + 1, keepReadOnly)];
    case "boolean":
      return true;
    case "integer":
    case "number":
      return 0;
    case "string":
      return node.format === "date-time" ? "2020-01-01T00:00:00Z" : "";
    default:
      return null;
  }
}
