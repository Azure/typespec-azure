import type { DiagnosticTarget, SourceFile, Type } from "@typespec/compiler";
import type { DiffKind } from "./diff-kind.js";

/**
 * Source location tracing back to a TypeSpec declaration.
 * Every diff carries this so findings can be reported with file:line:col
 * and suppressions can be matched by declaration identity.
 */
export interface SourcePath {
  /** The source file containing the declaration. */
  file: SourceFile;
  /** Start position (character offset) in the source file. */
  pos: number;
  /** End position (character offset) in the source file. */
  end: number;
  /** Name of the declaration (model, property, operation, etc.) for display. */
  declarationName?: string;
}

/**
 * The origin declaration for deduplication and suppression matching.
 * Resolved via the origin resolution algorithm:
 * 1. If property's parent model is a named declaration → the property itself
 * 2. If parent is anonymous but sourceProperty exists → follow to named declaration
 * 3. Otherwise → the operation parameter
 */
export interface OriginDeclaration {
  /** The resolved TypeSpec diagnostic target that is the canonical origin. */
  target: DiagnosticTarget;
  /** Source location of the origin. */
  sourcePath: SourcePath;
}

/**
 * A single structural difference detected by the diff engine.
 * Context-neutral — the policy engine determines severity.
 */
export interface ApiDiff {
  /** What kind of difference was detected. */
  kind: DiffKind;

  /** Source location of the affected declaration (for reporting and suppression matching). */
  sourcePath: SourcePath;

  /** The resolved origin declaration (for deduplication across operations). */
  origin: OriginDeclaration;

  /** The base type (before the change), if applicable. */
  baseType?: Type;

  /** The head type (after the change), if applicable. */
  headType?: Type;

  /** Human-readable description of the diff. */
  message: string;

  /** The direction context: was this found in a request or response position? */
  direction: "request" | "response" | "service";

  /** Operation(s) affected by this diff (populated during deduplication). */
  affectedOperations: OperationReference[];
}

/**
 * A reference to an operation for reporting purposes.
 */
export interface OperationReference {
  /** HTTP method. */
  method: string;
  /** Normalized path. */
  path: string;
  /** Operation name in TypeSpec source. */
  name: string;
}

/**
 * Comparison phase context.
 */
export type ComparisonPhase = "same-version" | "cross-version";

/**
 * A classified finding after the policy engine has evaluated a diff.
 */
export interface Finding {
  /** The underlying diff that was classified. */
  diff: ApiDiff;

  /** Severity assigned by the policy engine. */
  severity: "error" | "ignore";

  /** The rule that produced this classification. */
  rule: string;

  /** Which comparison phase produced this finding. */
  phase: ComparisonPhase;

  /** Whether this finding was suppressed by an @approvedBreakingChange or @approvedUnversionedChange decorator. */
  suppressed: boolean;

  /** If suppressed, the reason provided in the suppression decorator. */
  suppressionReason?: string;

  /** Version pair that produced this finding. */
  versionPair: VersionPair;
}

/**
 * A version pair selected for comparison.
 */
export interface VersionPair {
  /** The base version string (e.g., "2024-01-01"). */
  baseVersion: string;
  /** The head version string (e.g., "2025-01-01"). */
  headVersion: string;
  /** Which phase this pair belongs to. */
  phase: ComparisonPhase;
}

/**
 * A compiled and versioned view of a TypeSpec service, ready for comparison.
 */
export interface VersionedView {
  /** The api-version string this view represents. */
  version: string;
  /** The TypeSpec Program for this version (after mutators applied). */
  // Program type imported from @typespec/compiler at usage site
  program: unknown;
}

/**
 * A comparison pair ready for the diff engine.
 */
export interface ComparisonPair {
  /** The base view (left side of comparison). */
  base: VersionedView;
  /** The head view (right side of comparison). */
  head: VersionedView;
  /** The comparison phase. */
  phase: ComparisonPhase;
  /** Version pair metadata. */
  versionPair: VersionPair;
}

/**
 * Summary of analysis results.
 */
export interface AnalysisResult {
  /** All findings (classified diffs). */
  findings: Finding[];
  /** Timing information for performance validation. */
  timing: TimingInfo;
}

/**
 * Performance timing for each analysis stage.
 */
export interface TimingInfo {
  compileBaseMs: number;
  compileHeadMs: number;
  versionMutatorsMs: number;
  canonicalizeMs: number;
  identityMatchingMs: number;
  diffEngineMs: number;
  classifyMs: number;
  suppressMs: number;
  reportMs: number;
  totalMs: number;
}
