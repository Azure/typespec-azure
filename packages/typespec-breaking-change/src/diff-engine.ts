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

import { isOperationIdentity } from "./types.js";

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
    diffs: deduplicateDiffs(diffs),
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

/**
 * Deduplicate diffs that share the same origin declaration and DiffKind.
 *
 * When a model type is used in multiple operations, the same structural change
 * produces duplicate diffs. This groups them by {origin.declarationPath, kind}
 * and collapses each group to a single diff, annotating it with all affected operations.
 *
 * Diffs without an origin (operation-specific) pass through unchanged.
 */
export function deduplicateDiffs(diffs: ApiDiff[]): ApiDiff[] {
  const withOrigin: ApiDiff[] = [];
  const withoutOrigin: ApiDiff[] = [];

  for (const diff of diffs) {
    if (diff.origin) {
      withOrigin.push(diff);
    } else {
      withoutOrigin.push(diff);
    }
  }

  if (withOrigin.length === 0) {
    return diffs;
  }

  // Group by {declarationPath, kind}
  const groups = new Map<string, ApiDiff[]>();
  for (const diff of withOrigin) {
    const key = `${diff.origin!.declarationPath}::${diff.kind}`;
    const group = groups.get(key);
    if (group) {
      group.push(diff);
    } else {
      groups.set(key, [diff]);
    }
  }

  const deduplicated: ApiDiff[] = [];
  for (const [, group] of groups) {
    const representative = group[0];

    if (group.length === 1) {
      deduplicated.push(representative);
      continue;
    }

    // Collect all affected operations
    const affectedOperations: OperationIdentity[] = [];
    for (const diff of group) {
      if (isOperationIdentity(diff.identity)) {
        const op = diff.identity.operation;
        if (!affectedOperations.some((a) => a.method === op.method && a.path === op.path)) {
          affectedOperations.push(op);
        }
      }
    }

    deduplicated.push({
      ...representative,
      details: {
        ...representative.details,
        affectedOperations,
        deduplicatedCount: group.length,
      },
    });
  }

  return [...deduplicated, ...withoutOrigin];
}
