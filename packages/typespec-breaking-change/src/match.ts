import type { OperationIdentity } from "./types.js";
import type { CanonicalizedOperation, CanonicializedOperationMap } from "./canonicalize.js";
import { identityKey } from "./canonicalize.js";

/**
 * Result of matching base operations to head operations.
 */
export interface OperationMatchResult {
  /** Operations present in both base and head, matched by identity. */
  matched: MatchedOperation[];
  /** Operations in base but not in head (removed). */
  removed: CanonicalizedOperation[];
  /** Operations in head but not in base (added). */
  added: CanonicalizedOperation[];
}

/**
 * A pair of matched operations (same wire identity in base and head).
 */
export interface MatchedOperation {
  identity: OperationIdentity;
  base: CanonicalizedOperation;
  head: CanonicalizedOperation;
}

/**
 * Match operations between base and head by wire identity.
 * Identifies matched pairs, added operations, and removed operations.
 *
 * @param baseOps - Canonicalized operations from the base version
 * @param headOps - Canonicalized operations from the head version
 * @returns Matched, added, and removed operations
 */
export function matchOperations(
  baseOps: CanonicializedOperationMap,
  headOps: CanonicializedOperationMap,
): OperationMatchResult {
  const matched: MatchedOperation[] = [];
  const removed: CanonicalizedOperation[] = [];
  const added: CanonicalizedOperation[] = [];

  // Find matched and removed (in base, check if in head)
  for (const [key, baseOp] of baseOps.operations) {
    const headOp = headOps.operations.get(key);
    if (headOp) {
      matched.push({
        identity: baseOp.identity,
        base: baseOp,
        head: headOp,
      });
    } else {
      removed.push(baseOp);
    }
  }

  // Find added (in head but not in base)
  for (const [key, headOp] of headOps.operations) {
    if (!baseOps.operations.has(key)) {
      added.push(headOp);
    }
  }

  return { matched, removed, added };
}
