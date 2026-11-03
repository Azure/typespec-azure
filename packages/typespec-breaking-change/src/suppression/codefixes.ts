import { defineCodeFix, getSourceLocation, type CodeFix } from "@typespec/compiler";
import { isOperationIdentity, type Finding } from "../types.js";
import { composeFullIdentityPath, resolveSuppressionTarget } from "./target.js";

/**
 * Create a phase-appropriate approval on a surviving source declaration.
 *
 * @param finding - The finding to create a codefix for
 * @returns A CodeFix, or undefined if no suitable target exists
 */
export function createApproveBreakingChangeCodeFix(finding: Finding): CodeFix | undefined {
  if (finding.phase === "same-version" && finding.diff.kind === "OperationRemoved") {
    return undefined;
  }
  // A same-version removal's origin belongs to the baseline, not the file being edited.
  const suppressionTarget =
    finding.phase === "same-version" && !finding.diff.headType
      ? {
          target: finding.diff.operationType,
          path: isOperationIdentity(finding.diff.identity)
            ? composeFullIdentityPath(finding.diff.identity)
            : undefined,
        }
      : resolveSuppressionTarget(finding);
  const target = suppressionTarget.target;
  if (!target) return undefined;
  const pathOption = suppressionTarget.path
    ? `, path: ${JSON.stringify(suppressionTarget.path)}`
    : "";
  const crossVersion = finding.phase === "cross-version";
  const decorator = crossVersion ? "approvedBreakingChange" : "approvedUnversionedChange";
  const sinceOption = crossVersion
    ? `, since: ${JSON.stringify(finding.versionPair.headVersion)}`
    : "";
  const args = [
    JSON.stringify(`Approved: ${finding.diff.message}`),
    `#{ kind: ${JSON.stringify(finding.diff.kind)}${pathOption}${sinceOption} }`,
  ];

  return defineCodeFix({
    id: `add-decorator-${decorator}`,
    label: `Approve this change with @Azure.Core.${decorator}`,
    fix: (context) => {
      const location = getSourceLocation(target);
      const lineStart = location.file.text.lastIndexOf("\n", location.pos - 1) + 1;
      const indent = location.file.text.slice(lineStart, location.pos).match(/^[ \t]*/)?.[0] ?? "";
      // Insert at the declaration, not the line start: properties may share a line with their model.
      return context.prependText(
        location,
        `@Azure.Core.${decorator}(${args.join(", ")})\n${indent}`,
      );
    },
  });
}
