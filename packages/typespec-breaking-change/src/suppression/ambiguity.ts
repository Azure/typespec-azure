import type { Finding } from "../types.js";
import { isOperationIdentity } from "../types.js";
import { composeFullIdentityPath } from "./suppression.js";

/**
 * Result of ambiguity detection for a single unscoped approval.
 */
export interface AmbiguityResult {
  /** The finding identity key that is ambiguous */
  findingKey: string;
  /** All version transitions this unscoped approval matches */
  matchedVersions: string[];
  /** Findings that should be un-suppressed due to ambiguity */
  unsuppressedFindings: Finding[];
}

/**
 * Detect ambiguous unscoped suppressions: an unscoped approval that matches
 * the same logical finding across 2+ distinct stable version transitions.
 *
 * When detected:
 * - The earliest occurrence remains suppressed
 * - Later occurrences are marked unsuppressed with `ambiguousSuppressionDetected`
 *
 * @param findings - All findings after suppression has been applied
 * @returns Findings with ambiguous later occurrences un-suppressed
 */
export function detectAmbiguousSuppressions(findings: Finding[]): Finding[] {
  // Group suppressed findings by their suppression match key
  // (the combination of diff kind + identity path that makes them "the same" finding)
  const suppressedByMatchKey = new Map<string, Finding[]>();

  for (const finding of findings) {
    if (!finding.suppressed) continue;
    if (finding.suppressionIsScoped) continue; // scoped suppressions are never ambiguous
    if (finding.versionPair.phase !== "cross-version") continue;

    const matchKey = buildFindingMatchKey(finding);
    if (!matchKey) continue;

    const existing = suppressedByMatchKey.get(matchKey);
    if (existing) {
      existing.push(finding);
    } else {
      suppressedByMatchKey.set(matchKey, [finding]);
    }
  }

  // For each group with 2+ distinct head versions, check if any use unscoped suppression
  const ambiguousFindings = new Set<Finding>();

  for (const [, groupedFindings] of suppressedByMatchKey) {
    // Get distinct head versions
    const headVersions = [...new Set(groupedFindings.map((f) => f.versionPair.headVersion))];
    if (headVersions.length < 2) continue;

    // Sort by version (lexicographic works for date-based versions)
    headVersions.sort();

    // The first occurrence stays suppressed; later ones become unsuppressed
    const sortedFindings = [...groupedFindings].sort((a, b) =>
      a.versionPair.headVersion.localeCompare(b.versionPair.headVersion),
    );

    // Mark all but the earliest as ambiguous
    for (let i = 1; i < sortedFindings.length; i++) {
      ambiguousFindings.add(sortedFindings[i]);
    }
  }

  if (ambiguousFindings.size === 0) return findings;

  // Return findings with ambiguous ones un-suppressed
  return findings.map((finding) => {
    if (ambiguousFindings.has(finding)) {
      return {
        ...finding,
        suppressed: false,
        ambiguousSuppressionDetected: true,
      };
    }
    return finding;
  });
}

/**
 * Build a key that identifies "the same logical finding" across version pairs.
 * Used to detect when one unscoped approval suppresses the same diff in multiple transitions.
 */
function buildFindingMatchKey(finding: Finding): string | undefined {
  const identity = finding.diff.identity;
  if (!isOperationIdentity(identity)) return undefined;

  const path = composeFullIdentityPath(identity);
  const opKey = `${identity.operation.method}:${identity.operation.path}`;

  return `${finding.diff.kind}|${opKey}|${path}`;
}
