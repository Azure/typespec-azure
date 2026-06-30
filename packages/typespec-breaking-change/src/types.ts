import type { Program, SourceLocation, Type, Value } from "@typespec/compiler";
import type { DiffKind } from "./diff-kind.js";

/**
 * The direction component of a diff — request or response.
 */
export type DiffComponent = "request" | "response";

/**
 * Version-independent operation identity: HTTP method + normalized path.
 * Path parameters are normalized (names stripped), structure preserved.
 * Example: { method: "GET", path: "/subscriptions/{}/resourceGroups/{}/providers/Microsoft.Foo/bars/{}" }
 */
export interface OperationIdentity {
  /** HTTP method. */
  method: string;
  /** Normalized path (parameter names replaced with {}). */
  path: string;
  /** Operation name in TypeSpec source (for display/debugging). */
  name?: string;
}

/**
 * Operation-relative identity — locates a diff within an operation's wire contract.
 * Always the primary identity for operation-level diffs.
 *
 * Examples:
 * - `{ operation: { method: "GET", path: "/widgets/{}" }, component: "request", element: "query.filter" }`
 * - `{ operation: { method: "PUT", path: "/widgets/{}" }, component: "request", element: "body.properties.tags" }`
 * - `{ operation: { method: "GET", path: "/widgets/{}" }, component: "response", statusCode: "200", element: "body.properties.name" }`
 */
export interface OperationDiffIdentity {
  /** The operation this diff belongs to. */
  operation: OperationIdentity;
  /** Whether the diff is in the request or response direction. */
  component: DiffComponent;
  /** For response diffs — which status code (e.g., "200", "404", "*"). */
  statusCode?: string;
  /**
   * The specific element path within the operation.
   * Keywords: path.<name>, query.<name>, headers.<name>, body, body.properties.<name>,
   * contentTypes.<type>, properties.<name> (nested).
   */
  element: string;
}

/**
 * Service-level identity — for diffs affecting the entire service (auth, versioning, endpoints).
 *
 * Examples:
 * - `{ element: "authSchemes.Bearer" }`
 * - `{ element: "versions.2024-01-01" }`
 */
export interface ServiceDiffIdentity {
  /** The specific service-level element. */
  element: string;
}

/** Primary identity for a diff — either operation-relative or service-level. */
export type DiffIdentity = OperationDiffIdentity | ServiceDiffIdentity;

/** Type guard: is this an operation-relative identity? */
export function isOperationIdentity(id: DiffIdentity): id is OperationDiffIdentity {
  return "operation" in id;
}

/** Type guard: is this a service-level identity? */
export function isServiceIdentity(id: DiffIdentity): id is ServiceDiffIdentity {
  return !("operation" in id);
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
   * Primary identity — where in the API surface this change occurred.
   * Always present. Either operation-relative or service-level.
   * Also used for operation-scoped suppression matching.
   */
  identity: DiffIdentity;

  /**
   * Resolved origin declaration — present when the diff element traces back to
   * a named TypeSpec declaration. Serves two purposes:
   * 1. Declaration-scoped suppression (decorator on the named type suppresses globally)
   * 2. Deduplication (same {origin, kind} across operations = same diff, keep one)
   *
   * Resolution algorithm:
   * 1. Property's parent model is a named declaration → the property itself
   * 2. Parent is anonymous but sourceProperty exists → follow to named declaration
   * 3. Otherwise → absent (diff is operation-specific, no shared origin)
   */
  origin?: OriginDeclaration;

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
}

/**
 * The resolved origin declaration for deduplication and declaration-scoped suppression.
 * Contains both a string path (for suppression pattern matching) and compiler
 * references (for identity comparison during dedup and decorator lookup).
 */
export interface OriginDeclaration {
  /** Fully-qualified declaration path (e.g., "Microsoft.Foo.Models.Widget.tags"). */
  declarationPath: string;
  /** The TypeSpec type at the origin (for reference equality during dedup, decorator lookup). */
  type: Type;
  /** Source location of the declaration (for error reporting). */
  sourceLocation: SourceLocation;
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
