import type { Program } from "@typespec/compiler";
import { findSuppressions, findUnversionedSuppressions } from "./decorators.js";
import type { Finding } from "./types.js";

/**
 * Apply suppression metadata to classified findings.
 *
 * A suppression matches if:
 * 1. Its `kind` is undefined (wildcard) OR matches the finding's diff kind
 * 2. Its `version` is undefined (no scope) OR the finding's head version is >= the since version
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

    const suppressions =
      finding.phase === "same-version"
        ? findUnversionedSuppressions(program, targetType)
        : findSuppressions(program, targetType);

    const match = suppressions.find(
      (suppression) =>
        (suppression.suppression.kind === undefined ||
          suppression.suppression.kind === finding.diff.kind) &&
        (suppression.suppression.version === undefined ||
          finding.versionPair.headVersion >= suppression.suppression.version),
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
