import type { Program, SourceLocation, Type, Value } from "@typespec/compiler";
import type { DiffKind } from "./diff-kind.js";

/**
 * The direction component of a diff — request, response, or service-level.
 */
export type DiffComponent = "request" | "response" | "service";

/**
 * Version-independent identity for where in the API surface a change occurred.
 * This is the same path format used in `@approvedBreakingChange` `path:` values
 * for suppression matching.
 *
 * For operation-relative diffs:
 * - `{ operation: "GET /widgets/{widgetId}", component: "request", element: "query.filter" }`
 * - `{ operation: "PUT /widgets/{widgetId}", component: "request", element: "body.properties.tags" }`
 * - `{ operation: "GET /widgets/{widgetId}", component: "response", statusCode: "200", element: "body.properties.name" }`
 *
 * For diffs on named model declarations (shared across operations):
 * - `{ declarationPath: "Microsoft.Foo.Models.BarProperties.legacyStatus", element: "properties.legacyStatus" }`
 *
 * For service-level diffs:
 * - `{ component: "service", element: "authSchemes.Bearer" }`
 */
export interface DiffPath {
  /** Operation wire identity (e.g., "GET /widgets/{widgetId}"). Absent for service-level and model-level diffs. */
  operation?: string;
  /** TypeSpec declaration path for diffs on named types (e.g., "Microsoft.Foo.Models.BarProperties.legacyStatus"). */
  declarationPath?: string;
  /** Direction component. Absent for operation-level diffs (added/removed). */
  component?: DiffComponent;
  /** For response diffs — which status code. */
  statusCode?: string;
  /** The specific element (parameter name, property path, status code, etc.). */
  element: string;
}

/**
 * A single structural difference detected by the diff engine.
 * Context-neutral — the policy engine determines severity.
 *
 * Corresponds to the `ApiDiff` interface in diff-taxonomy.md.
 */
export interface ApiDiff {
  /** What kind of difference was detected. */
  kind: DiffKind;

  /**
   * Version-independent path identifying where the change occurred.
   * Used for suppression matching and deduplication.
   */
  path: DiffPath;

  /** Value in base (e.g., default value). Undefined if element was added. */
  baseValue?: Value;

  /** Value in head (e.g., default value). Undefined if element was removed. */
  headValue?: Value;

  /** Source location in the base compilation (for the affected declaration). */
  baseSourceLocation?: SourceLocation;

  /** Source location in the head compilation (for the affected declaration). */
  headSourceLocation?: SourceLocation;

  /** Reference to the TypeSpec type in base (for suppression lookup, walking type chain). */
  baseType?: Type;

  /** Reference to the TypeSpec type in head (for suppression lookup, walking type chain). */
  headType?: Type;

  /** Structured details specific to this DiffKind (e.g., { name, isRequired }, { propertyPath, baseType, headType }). */
  details?: Record<string, unknown>;

  /** Human-readable description of the diff. */
  message: string;

  /**
   * The resolved origin declaration for deduplication across operations.
   * Resolution algorithm:
   * 1. Property's parent model is a named declaration → the property itself
   * 2. Parent is anonymous but sourceProperty exists → follow to named declaration
   * 3. Otherwise → the operation parameter
   */
  origin: OriginDeclaration;

  /** Operation(s) affected by this diff (populated during deduplication). */
  affectedOperations: OperationIdentity[];
}

/**
 * The origin declaration for deduplication and suppression matching.
 */
export interface OriginDeclaration {
  /** Source location of the canonical origin declaration. */
  sourceLocation: SourceLocation;
  /** The TypeSpec type at the origin (for identity comparison and suppression lookup). */
  type?: Type;
  /** Display name of the declaration (model name, property name, etc.). */
  declarationName?: string;
}

/**
 * Version-independent operation identity: HTTP method + normalized path.
 * Path parameters are normalized (names stripped), structure preserved.
 * Example: "GET /subscriptions/{}/resourceGroups/{}/providers/Microsoft.Foo/bars/{}"
 */
export interface OperationIdentity {
  /** HTTP method. */
  method: string;
  /** Normalized path (parameter names replaced with {}). */
  path: string;
  /** Operation name in TypeSpec source. */
  name?: string;
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

  /** Whether this finding was suppressed by a decorator. */
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
  program: Program;
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
