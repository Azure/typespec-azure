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

  for (const [name, descriptor] of Object.entries(signature.parameters)) {
    if (IMPLICIT_PARAMS.has(name.toLowerCase())) continue;
    const { in: location, schema } = descriptor as { in?: string; schema?: unknown };
    const bucket =
      location === "path"
        ? (request.path ??= {})
        : location === "header"
          ? (request.headers ??= {})
          : (request.query ??= {});
    bucket[name] = skeletonForSchema(schema, 0) ?? `<${name}>`;
  }

  if (signature.body !== undefined) {
    request.body = skeletonForSchema(signature.body, 0);
  }

  const responses: Record<string, { body?: unknown }> = {};
  const codes = Object.keys(signature.responses);
  const chosen = codes.filter((code) => SUCCESS_CODES.includes(code));
  for (const code of (chosen.length > 0 ? chosen : codes.slice(0, 1)) ?? []) {
    const schema = signature.responses[code];
    responses[code] = schema == null ? {} : { body: skeletonForSchema(schema, 0) };
  }

  return { request, responses };
}

/** Produce a minimal placeholder value for a resolved JSON schema node. */
export function skeletonForSchema(schema: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH || schema === null || typeof schema !== "object") return null;
  const node = schema as AnyRecord;

  if (node.$circularRef !== undefined || node.$unresolvedRef !== undefined) return null;
  if (Array.isArray(node.enum) && node.enum.length > 0) return node.enum[0];
  if (node.default !== undefined) return node.default;
  if (Array.isArray(node.allOf)) {
    return node.allOf.reduce<Record<string, unknown>>((acc, part) => {
      const value = skeletonForSchema(part, depth);
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
        if ((propSchema as AnyRecord)?.readOnly === true && !required.includes(name)) continue;
        out[name] = skeletonForSchema(propSchema, depth + 1);
      }
      return out;
    }
    case "array":
      return [skeletonForSchema(node.items, depth + 1)];
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
