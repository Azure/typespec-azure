import { createAddDecoratorCodeFix, type CodeFix, type DiagnosticTarget, type Type } from "@typespec/compiler";
import type { Finding } from "./types.js";

/**
 * Create a codefix that adds @approvedBreakingChange decorator to suppress a finding.
 *
 * Targets the origin declaration type when available (suppresses all uses of that declaration),
 * falling back to the head type (wire type where the change was detected).
 *
 * @param finding - The finding to create a codefix for
 * @returns A CodeFix, or undefined if no suitable target exists
 */
export function createApproveBreakingChangeCodeFix(finding: Finding): CodeFix | undefined {
  const target = getCodefixTarget(finding);
  if (!target) return undefined;

  return createAddDecoratorCodeFix(target as DiagnosticTarget, "approvedBreakingChange", [
    `"Approved: ${escapeString(finding.diff.message)}"`,
    `"${finding.diff.kind}"`,
  ]);
}

/**
 * Get the best target node for the codefix decorator insertion.
 * Prefers origin type (named declaration) over wire type.
 */
function getCodefixTarget(finding: Finding): Type | undefined {
  // Prefer origin — it's the named declaration that "owns" the change
  if (finding.diff.origin?.type) {
    return finding.diff.origin.type;
  }

  // Fallback to head type (where the change is visible in the current spec)
  if (finding.diff.headType) {
    return finding.diff.headType;
  }

  // For removals, the base type might be all we have
  return finding.diff.baseType;
}

function escapeString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
