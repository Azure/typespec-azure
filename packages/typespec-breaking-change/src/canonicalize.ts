import type { Namespace, Program } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import {
  HttpCanonicalizer,
  OperationHttpCanonicalization,
} from "@typespec/http-canonicalization";
import { listHttpOperationsIn } from "@typespec/http";
import { getOperationIdentity, identityKey } from "./operation-identity.js";
import type { OperationIdentity } from "./types.js";

/**
 * A canonicalized operation with its wire identity.
 */
export interface CanonicalizedOperation {
  /** Version-independent wire identity. */
  identity: OperationIdentity;
  /** The canonicalized HTTP operation (request/response shapes with wire types). */
  canonical: OperationHttpCanonicalization;
}

/**
 * Map of canonicalized operations keyed by identity string.
 */
export interface CanonicalizationResult {
  /** Operations keyed by identity string ("GET /widgets/{}"). */
  operations: Map<string, CanonicalizedOperation>;
  /** The canonicalizer instance (for reuse if needed). */
  canonicalizer: HttpCanonicalizer;
}

/**
 * Canonicalize all HTTP operations in a versioned namespace.
 *
 * Creates an HttpCanonicalizer, resolves all HTTP operations from the namespace,
 * canonicalizes each one, and returns them keyed by wire identity.
 */
export function canonicalizeOperations(
  program: Program,
  namespace: Namespace,
): CanonicalizationResult {
  const tk = $(program);
  const canonicalizer = new HttpCanonicalizer(tk);

  const [httpOps, _diagnostics] = listHttpOperationsIn(program, namespace);
  const operations = new Map<string, CanonicalizedOperation>();

  for (const httpOp of httpOps) {
    const identity = getOperationIdentity(httpOp);
    const key = identityKey(identity);
    const canonical = canonicalizer.canonicalize(
      httpOp.operation,
    ) as OperationHttpCanonicalization;

    operations.set(key, { identity, canonical });
  }

  return { operations, canonicalizer };
}
