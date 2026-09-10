export {
  canonicalizeOperations,
  type CanonicalizationResult,
  type CanonicalizedOperation,
} from "./diff/canonicalize.js";
export { formatResult, main, parseArgs, type CliOptions } from "./cli/cli.js";
export { createApproveBreakingChangeCodeFix } from "./suppression/codefixes.js";
export { compileService, type CompileOptions } from "./cli/compile.js";
export {
  $approvedBreakingChange,
  $approvedUnversionedChange,
  findSuppressions,
  findUnversionedSuppressions,
  getSuppressions,
  getUnversionedSuppressions,
  type ResolvedSuppression,
  type SuppressionMetadata,
} from "./suppression/decorators.js";
export { emitFindingDiagnostics } from "./suppression/diagnostics.js";
export * from "./diff/diff-engine.js";
export { diffKinds, isDiffKind, type DiffKind } from "./diff-kind.js";
export * from "./diff/diff-operations.js";
export * from "./diff/diff-types.js";
export { $lib, BreakingChangeStateKeys } from "./lib.js";
export { matchOperations, type MatchedOperation, type OperationMatchResult } from "./suppression/match.js";
export {
  getOperationIdentity,
  identityKey,
  normalizePath,
  resolveOperationIdentities,
  type OperationIdentityMap,
  type ResolvedOperation,
} from "./diff/operation-identity.js";
export { resolveOrigin } from "./diff/origin.js";
export * from "./pipeline/orchestrator.js";
export * from "./pipeline/policy.js";
export { resolveFindingLocation } from "./pipeline/resolve-location.js";
export {
  diffKindCatalog,
  getDiffKindCatalogEntry,
  type DiffKindCatalogEntry,
  type DiffKindSupportStatus,
} from "./rule-catalog.js";
export * from "./reporting/reporter-console.js";
export * from "./reporting/reporter-github.js";
export * from "./reporting/reporter-json.js";
export * from "./reporting/reporter-markdown.js";
export * from "./suppression/suppression-guidance.js";
export * from "./suppression/suppression.js";
export {
  buildSuppressionInventory,
  suppressionIdentityKey,
  type NormalizedSuppressionRecord,
} from "./suppression/inventory.js";
export {
  compareSuppressions,
  compareInventories,
  type ClassifiedSuppression,
  type SuppressionClassificationKind,
  type SuppressionComparisonResult,
} from "./suppression/classification.js";
export { detectAmbiguousSuppressions, type AmbiguityResult } from "./suppression/ambiguity.js";
export { isOperationIdentity, isServiceIdentity } from "./types.js";
export type {
  AnalysisResult,
  AnalysisSummary,
  ApiDiff,
  ComparisonPair,
  ComparisonPhase,
  DiffComponent,
  DiffIdentity,
  Finding,
  OperationDiffIdentity,
  OperationIdentity,
  OriginDeclaration,
  ResolvedLocation,
  ServiceDiffIdentity,
  SourceTraceLevel,
  TimingInfo,
  VersionComparisonSummary,
  VersionPair,
  VersionedView,
} from "./types.js";
export {
  buildComparisonPairs,
  buildPhaseAPairs,
  buildPhaseBPairs,
  createVersionedView,
  defaultVersionClassifier,
  enumerateVersions,
  type ServiceVersionInfo,
  type VersionClassifier,
} from "./pipeline/versions.js";
