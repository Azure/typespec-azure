import { createAddDecoratorCodeFix, type CodeFix, type Program } from "@typespec/compiler";
import { isOperationIdentity, type Finding } from "../types.js";
import {
  composeFullIdentityPath,
  isSameVersionRemoval,
  resolveSameVersionRemovalTarget,
  resolveSuppressionTarget,
} from "./target.js";

/**
 * Create a phase-appropriate approval on a surviving source declaration.
 *
 * @param finding - The finding to create a codefix for
 * @param program - Head program, required to locate a deleted operation's surviving parent
 * @returns A CodeFix, or undefined if no suitable target exists
 */
export function createApproveBreakingChangeCodeFix(
  finding: Finding,
  program?: Program,
): CodeFix | undefined {
  // A same-version removal's origin belongs to the baseline, not the file being edited.
  const sameVersionRemoval = isSameVersionRemoval(finding);
  const suppressionTarget = sameVersionRemoval
    ? ((program ? resolveSameVersionRemovalTarget(finding, program) : undefined) ??
      (finding.diff.kind !== "OperationRemoved" &&
      finding.diff.operationType &&
      isOperationIdentity(finding.diff.identity)
        ? {
            target: finding.diff.operationType,
            path: composeFullIdentityPath(finding.diff.identity),
            scope: "operation" as const,
          }
        : undefined))
    : finding.phase === "same-version" && !finding.diff.headType
      ? {
          target: finding.diff.operationType,
          path: isOperationIdentity(finding.diff.identity)
            ? composeFullIdentityPath(finding.diff.identity)
            : undefined,
          scope: "operation" as const,
        }
      : resolveSuppressionTarget(finding);
  if (!suppressionTarget?.target) return undefined;
  const target = suppressionTarget.target;
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

  const fix = createAddDecoratorCodeFix(target, `Azure.Core.${decorator}`, args);
  return { ...fix, label: `Approve this change with @Azure.Core.${decorator}` };
}
