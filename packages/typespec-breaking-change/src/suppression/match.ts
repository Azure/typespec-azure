import type { OperationIdentity } from "./types.js";
import type { ResolvedOperation, OperationIdentityMap } from "./operation-identity.js";

/**
 * Result of matching base operations to head operations.
 */
export interface OperationMatchResult {
  /** Operations present in both base and head, matched by identity. */
  matched: MatchedOperation[];
  /** Operations in base but not in head (removed). */
  removed: ResolvedOperation[];
  /** Operations in head but not in base (added). */
  added: ResolvedOperation[];
}

/**
 * A pair of matched operations (same wire identity in base and head).
 */
export interface MatchedOperation {
  identity: OperationIdentity;
  base: ResolvedOperation;
  head: ResolvedOperation;
}

/**
 * Match operations between base and head by wire identity.
 * Identifies matched pairs, added operations, and removed operations.
 *
 * @param baseOps - Resolved operations from the base version
 * @param headOps - Resolved operations from the head version
 * @returns Matched, added, and removed operations
 */
export function matchOperations(
  baseOps: OperationIdentityMap,
  headOps: OperationIdentityMap,
): OperationMatchResult {
  const matched: MatchedOperation[] = [];
  const removed: ResolvedOperation[] = [];
  const added: ResolvedOperation[] = [];

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
