/**
 * Structural, OpenAPI-diff (oad)-parity comparison of two operation signatures. Reports whether the
 * operation's contract changed between API versions, with human-readable reasons. Used by `add` to
 * decide whether a new example is needed: an operation only gets a fresh `since` variant when its
 * request/response shape actually changed.
 */

import type { OperationSignature } from "./signature.js";

/** The outcome of diffing one operation across two versions. */
export interface OperationDiff {
  /** Whether the operation's contract changed at all. */
  readonly changed: boolean;
  /** Human-readable descriptions of each change (empty when unchanged). */
  readonly reasons: string[];
}

/**
 * Compare the `previous` and `next` signatures of the same operation. Parameters, request body, and
 * every response are compared by resolved shape (order-independent), mirroring how oad classifies a
 * contract change.
 */
export function diffOperation(
  previous: OperationSignature,
  next: OperationSignature,
): OperationDiff {
  const reasons: string[] = [];

  const previousParams = new Set(Object.keys(previous.parameters));
  const nextParams = new Set(Object.keys(next.parameters));
  for (const name of nextParams) {
    if (!previousParams.has(name)) {
      reasons.push(`added parameter "${name}"`);
    } else if (!canonicalEqual(previous.parameters[name], next.parameters[name])) {
      reasons.push(`changed parameter "${name}"`);
    }
  }
  for (const name of previousParams) {
    if (!nextParams.has(name)) reasons.push(`removed parameter "${name}"`);
  }

  if (!canonicalEqual(previous.body, next.body)) {
    reasons.push(
      previous.body === undefined
        ? "added request body"
        : next.body === undefined
          ? "removed request body"
          : "changed request body",
    );
  }

  const previousCodes = new Set(Object.keys(previous.responses));
  const nextCodes = new Set(Object.keys(next.responses));
  for (const code of nextCodes) {
    if (!previousCodes.has(code)) {
      reasons.push(`added response "${code}"`);
    } else if (!canonicalEqual(previous.responses[code], next.responses[code])) {
      reasons.push(`changed response "${code}"`);
    }
  }
  for (const code of previousCodes) {
    if (!nextCodes.has(code)) reasons.push(`removed response "${code}"`);
  }

  return { changed: reasons.length > 0, reasons };
}

/** Order-independent deep equality via canonical JSON (object keys sorted recursively). */
export function canonicalEqual(a: unknown, b: unknown): boolean {
  return canonicalize(a) === canonicalize(b);
}

function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value === null || typeof value !== "object") return value ?? null;
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    out[key] = sortDeep(record[key]);
  }
  return out;
}
