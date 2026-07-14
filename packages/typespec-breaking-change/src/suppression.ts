import type { Program, Type } from "@typespec/compiler";
import {
  findSuppressions,
  findUnversionedSuppressions,
  type ResolvedSuppression,
} from "./decorators.js";
import { isOperationIdentity } from "./types.js";
import type { Finding } from "./types.js";

/**
 * Apply suppression metadata to classified findings.
 *
 * A suppression matches if:
 * 1. Its `kind` is undefined (wildcard) OR matches the finding's diff kind
 * 2. Its `version` is undefined (no scope) OR the finding's head version is >= the since version
 * 3. Its `path` is undefined OR matches the finding's identity element suffix
 */
export function applySuppressions(findings: Finding[], program: Program): Finding[] {
  return findings.map((finding) => {
    if (finding.severity !== "error") {
      return finding;
    }

    const targetType = finding.diff.headType ?? finding.diff.baseType;
    if (!targetType) {
      return finding;
    }

    // Collect suppressions from the wire type AND the origin type (if different)
    const allSuppressions = collectSuppressions(finding, program, targetType);

    const match = allSuppressions.find(
      (suppression) =>
        matchesKind(suppression, finding) &&
        matchesVersion(suppression, finding) &&
        matchesPath(suppression, finding),
    );

    if (!match) {
      return finding;
    }

    return {
      ...finding,
      suppressed: true,
      suppressionReason: match.suppression.reason,
    };
  });
}

/**
 * Collect suppressions from both the wire type and the origin declaration type.
 * The origin type may have suppressions that apply to all uses of that declaration.
 */
function collectSuppressions(
  finding: Finding,
  program: Program,
  targetType: Type,
): ResolvedSuppression[] {
  const finder =
    finding.phase === "same-version" ? findUnversionedSuppressions : findSuppressions;

  const suppressions = [...finder(program, targetType)];

  // Also check the origin type if it's different from the target
  const originType = finding.diff.origin?.type;
  if (originType && originType !== targetType) {
    suppressions.push(...finder(program, originType));
  }

  return suppressions;
}

function matchesKind(suppression: ResolvedSuppression, finding: Finding): boolean {
  return (
    suppression.suppression.kind === undefined || suppression.suppression.kind === finding.diff.kind
  );
}

function matchesVersion(suppression: ResolvedSuppression, finding: Finding): boolean {
  return (
    suppression.suppression.version === undefined ||
    finding.versionPair.headVersion >= suppression.suppression.version
  );
}

/**
 * Check if a suppression's path constraint matches the finding's element path.
 * Path matching uses suffix comparison — the suppression path should match
 * the end of the finding's element path.
 */
function matchesPath(suppression: ResolvedSuppression, finding: Finding): boolean {
  const suppressionPath = (suppression.suppression as any).path as string | undefined;
  if (!suppressionPath) return true;

  // Get the element path from the finding's identity
  const element = isOperationIdentity(finding.diff.identity)
    ? finding.diff.identity.element
    : undefined;

  if (!element) return false;

  return element === suppressionPath || element.endsWith(`.${suppressionPath}`);
}
