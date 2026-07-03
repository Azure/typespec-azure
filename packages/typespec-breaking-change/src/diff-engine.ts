import {
  canonicalizeOperations,
  type CanonicalizationResult,
} from "./canonicalize.js";
import { diffOperations } from "./diff-operations.js";
import type { DiffKind } from "./diff-kind.js";
import type {
  ApiDiff,
  OperationDiffIdentity,
  OperationIdentity,
  VersionedView,
} from "./types.js";

/**
 * Result of computing diffs between two versioned views.
 */
export interface DiffResult {
  /** All detected structural diffs. */
  diffs: ApiDiff[];
  /** Canonicalization result for the base view (for further inspection). */
  baseCanonicalization: CanonicalizationResult;
  /** Canonicalization result for the head view (for further inspection). */
  headCanonicalization: CanonicalizationResult;
}

/**
 * Compute all API diffs between base and head versioned views.
 *
 * Orchestration:
 * 1. Canonicalize both sides using HttpCanonicalizer
 * 2. Match operations by identity (method + normalized path)
 * 3. For unmatched: emit OperationAdded/OperationRemoved
 * 4. For matched: delegate to diffOperations for structural comparison
 */
export function computeDiffs(base: VersionedView, head: VersionedView): DiffResult {
  const baseCanonicalization = canonicalizeOperations(base.program, base.versionedNamespace);
  const headCanonicalization = canonicalizeOperations(head.program, head.versionedNamespace);

  const diffs: ApiDiff[] = [];
  const baseOps = baseCanonicalization.operations;
  const headOps = headCanonicalization.operations;

  for (const [key, baseOp] of baseOps) {
    if (!headOps.has(key)) {
      diffs.push(
        makeOperationDiff(
          "OperationRemoved",
          baseOp.identity,
          `Operation ${baseOp.identity.method} ${baseOp.identity.path} was removed.`,
        ),
      );
    }
  }

  for (const [key, headOp] of headOps) {
    if (!baseOps.has(key)) {
      diffs.push(
        makeOperationDiff(
          "OperationAdded",
          headOp.identity,
          `Operation ${headOp.identity.method} ${headOp.identity.path} was added.`,
        ),
      );
    }
  }

  for (const [key, baseOp] of baseOps) {
    const headOp = headOps.get(key);
    if (headOp) {
      diffs.push(...diffOperations(baseOp.canonical, headOp.canonical, baseOp.identity));
    }
  }

  return {
    diffs,
    baseCanonicalization,
    headCanonicalization,
  };
}

/**
 * Helper to create an operation-level diff (added/removed).
 */
function makeOperationDiff(kind: DiffKind, identity: OperationIdentity, message: string): ApiDiff {
  const diffIdentity: OperationDiffIdentity = {
    operation: identity,
    component: "request",
    element: "",
  };

  return {
    kind,
    identity: diffIdentity,
    message,
  };
}
