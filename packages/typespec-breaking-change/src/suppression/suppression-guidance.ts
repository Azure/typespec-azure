import type { SourceLocation } from "@typespec/compiler";
import type { Finding, OriginDeclaration } from "../types.js";
import { isOperationIdentity } from "../types.js";
import { resolveFindingLocation } from "../pipeline/resolve-location.js";

/**
 * Suppression guidance for a finding — tells the user exactly how to suppress
 * a detected breaking change if it is intentional.
 */
export interface SuppressionGuidance {
  /** The decorator to add (e.g., `@approvedBreakingChange("reason", #{ kind: "SomeKind" })`). */
  decorator: string;
  /** Where to place it: description of the target location. */
  placement: string;
  /** The file path where the decorator should be placed (if known). */
  file?: string;
  /** A complete code example showing the decorator in context. */
  example: string;
}

/**
 * Generate suppression guidance for a finding.
 * Tells the user what decorator to use and where to place it.
 */
export function formatSuppressionGuidance(finding: Finding): SuppressionGuidance {
  const kind = finding.diff.kind;
  const decoratorName =
    finding.phase === "same-version" ? "@approvedUnversionedChange" : "@approvedBreakingChange";

  const decorator = `${decoratorName}("your reason here", #{ kind: "${kind}" })`;
  const placement = getPlacementDescription(finding);
  const file = getTargetFile(finding);
  const example = buildExample(finding, decorator);

  return { decorator, placement, file, example };
}

/**
 * Get a one-line suppression hint suitable for console/annotation output.
 */
export function formatSuppressionHint(finding: Finding): string {
  const decoratorName =
    finding.phase === "same-version" ? "@approvedUnversionedChange" : "@approvedBreakingChange";

  // For Phase A removals, include path option to target the removed property
  if (finding.phase === "same-version" && finding.diff.origin) {
    const propertyPath = getPropertyPath(finding.diff.origin);
    if (propertyPath) {
      return `${decoratorName}("your reason here", #{ kind: "${finding.diff.kind}", path: "${propertyPath}" })`;
    }
  }

  return `${decoratorName}("your reason here", #{ kind: "${finding.diff.kind}" })`;
}

/**
 * Describe where the suppression decorator should be placed.
 */
function getPlacementDescription(finding: Finding): string {
  // If we have an origin, the decorator goes on the origin type
  if (finding.diff.origin) {
    return `On the declaration: ${finding.diff.origin.declarationPath}`;
  }

  // For operation-level changes, place on the operation
  if (isOperationIdentity(finding.diff.identity)) {
    const op = finding.diff.identity.operation;
    return `On the operation: ${op.method} ${op.path} (or on the affected model/property)`;
  }

  // Service-level changes
  return `On the service namespace or affected declaration`;
}

/**
 * Get the target file for placement (from origin or finding location).
 */
function getTargetFile(finding: Finding): string | undefined {
  if (finding.diff.origin?.sourceLocation) {
    return finding.diff.origin.sourceLocation.file.path;
  }

  return resolveFindingLocation(finding)?.location.file.path;
}

/**
 * Build a code example showing the decorator in context.
 */
function buildExample(finding: Finding, decorator: string): string {
  if (finding.diff.origin) {
    const path = finding.diff.origin.declarationPath;
    const parts = path.split(".");
    const name = parts[parts.length - 1];

    // Check if this is a property-level diff (element contains a property path)
    const element = finding.diff.identity.element;
    const isPropertyLevel =
      element.includes("properties.") ||
      element.includes("query.") ||
      element.includes("headers.") ||
      element.includes("path.");

    if (isPropertyLevel && parts.length > 1) {
      const parentName = parts[parts.length - 2];
      return [
        `model ${parentName} {`,
        `  ${decorator}`,
        `  ${name}: ...;`,
        `}`,
      ].join("\n");
    }

    // Type-level origin
    return [
      `${decorator}`,
      `model ${name} { ... }`,
    ].join("\n");
  }

  // Operation-level
  if (isOperationIdentity(finding.diff.identity)) {
    const opName = finding.diff.identity.operation.name ?? "myOperation";
    return [
      `${decorator}`,
      `op ${opName}(...): ...;`,
    ].join("\n");
  }

  // Fallback
  return decorator;
}

/**
 * Format a diff-style suppression snippet showing the decorator (as added line)
 * above the target declaration line it would decorate, with optional line numbers.
 *
 * For removed elements where no head source exists (unversioned removal in Phase A),
 * targets the parent model declaration since the property no longer exists.
 */
export function formatSuppressionDiff(finding: Finding): string {
  const decoratorName =
    finding.phase === "same-version" ? "@approvedUnversionedChange" : "@approvedBreakingChange";
  const hasDirectHeadLocation =
    finding.diff.headSourceTraceLevel === "direct" ||
    (finding.diff.headSourceTraceLevel === undefined && !!finding.diff.headType);
  const hasParentModelHeadLocation = finding.diff.headSourceTraceLevel === "parentModel";

  // Case 1: Property still exists in head (versioned changes, or non-removal diffs)
  // Decorator goes directly on the element.
  if (finding.diff.headSourceLocation && hasDirectHeadLocation) {
    const decorator = `${decoratorName}("reason", #{ kind: "${finding.diff.kind}" })`;
    return buildDiffFromLocation(finding.diff.headSourceLocation, decorator);
  }

  // Case 2: Property no longer exists in head — decorate the parent model with a path.
  // Decorator must go on the parent model with path option targeting the property.
  if ((hasParentModelHeadLocation || finding.phase === "same-version") && finding.diff.origin) {
    const propertyPath = getPropertyPath(finding.diff.origin);
    const decorator = propertyPath
      ? `${decoratorName}("reason", #{ kind: "${finding.diff.kind}", path: "${propertyPath}" })`
      : `${decoratorName}("reason", #{ kind: "${finding.diff.kind}" })`;
    return buildRemovedPropertyDiff(finding.diff.origin, decorator);
  }

  // Case 3: Origin exists (e.g., cross-version with origin from base)
  const decorator = `${decoratorName}("reason", #{ kind: "${finding.diff.kind}" })`;
  if (finding.diff.origin?.sourceLocation) {
    return buildDiffFromLocation(finding.diff.origin.sourceLocation, decorator);
  }

  // Case 4: Operation-level fallback
  if (finding.diff.operationSourceLocation) {
    return buildDiffFromLocation(finding.diff.operationSourceLocation, decorator);
  }

  // Final fallback: just show the decorator
  return `+ ${decorator}`;
}

/**
 * Extract the property name from an origin declaration path.
 * e.g., "Contoso.Management.EmployeeProperties.city" → "city"
 */
function getPropertyPath(origin: OriginDeclaration): string | undefined {
  const parts = origin.declarationPath.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : undefined;
}

/**
 * Build a diff snippet from a source location: decorator as added line, target line as context.
 * Uses standard diff format (+ prefix for additions, space for context) for GitHub rendering.
 */
function buildDiffFromLocation(loc: SourceLocation, decorator: string): string {
  const { text } = loc.file;
  const targetLine = getLineAtPos(text, loc.pos);
  const targetText = targetLine.trim();

  return `+ ${decorator}\n  ${targetText}`;
}

/**
 * Build a diff snippet for a removed property (Phase A unversioned).
 * The decorator goes on the parent model since the property no longer exists.
 */
function buildRemovedPropertyDiff(origin: OriginDeclaration, decorator: string): string {
  const parts = origin.declarationPath.split(".");
  const parentName = parts.length > 1 ? parts[parts.length - 2] : "Model";

  // Try to find the parent model declaration line from the origin source
  const loc = origin.sourceLocation;
  if (loc) {
    const { text } = loc.file;
    const modelPattern = new RegExp(`model\\s+${parentName}\\s*`);
    const textBefore = text.substring(0, loc.pos);
    const match = textBefore.match(modelPattern);
    if (match && match.index !== undefined) {
      const modelLine = getLineAtPos(text, match.index).trim();
      return `+ ${decorator}\n  ${modelLine}`;
    }
  }

  // Fallback: synthetic model line
  return `+ ${decorator}\n  model ${parentName} {`;
}

/** Get the full text of the line containing the given character offset. */
function getLineAtPos(text: string, pos: number): string {
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  let lineEnd = text.indexOf("\n", pos);
  if (lineEnd === -1) lineEnd = text.length;
  return text.substring(lineStart, lineEnd);
}

/** Get the 1-based line number for a character offset. */
function getLineNumber(text: string, pos: number): number {
  let line = 1;
  for (let i = 0; i < pos; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}
